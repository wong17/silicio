import { Injectable, NgZone, computed, effect, inject, signal, untracked } from '@angular/core';
import { SimulationCoordinator } from './controllers/simulation-coordinator';
import { MemoryLessonService, STEPS_OF } from './memory-lesson.service';
import { joinWord, splitWord } from '../simulation/memory-lesson';
import { Cpu8086Controller } from './controllers/cpu8086-controller';
import { PcController } from './controllers/pc-controller';
import { PcSession } from './pc-session.service';
import { pcSceneActivity } from './pc-activity';
import { MemoryLessonController } from './controllers/memory-controller';
import { SocController } from './controllers/soc-controller';
import { Cpu8086, hex, physicalAddress, REGISTER_NAMES, Registers, Snapshot, Trace } from '../simulation/cpu8086';
import { readSession } from '../simulation/session-codec';
import { LAB_MISSIONS, MISSIONS, meetsExpectation } from '../content/missions';
import { COURSE_PHASES, presentStep, type StepPresentation } from './step-presentation';
import type { MissionContext } from '../content/station-missions';
import { accessibleCatalog } from '../world/piece-definitions';
import { INSTRUMENT_PARTS } from '../world/internal-parts';
import type { Section } from '../world/scene-inputs';
import type { LampTarget } from '../world/lamp-limits';
import { forkOrigin, type TimelineState } from '../world/timeline-layout';
import type { SceneCommand } from '../world/scene-toolbar/scene-toolbar.component';
import { BufferExperiment, LaboratoryFacade } from './laboratory.facade';
import type { CameraView, PieceAnchor, ScreenAnchor } from '../world/scene-inputs';
import { IDLE_ACTIVITY, PHASES, projectActivity, projectBufferActivity, projectMemory, type Phase, type StationActivity } from './station-activity';
import { CacheLesson } from '../simulation/cache-lesson';
import { describePiece, type PieceOption } from './piece-descriptions';

export type Tab = 'state' | 'program' | 'trace';
export type Quality = 'high' | 'balanced' | 'low';
export type Branch = { id: string; trace: Trace[]; state: Snapshot; cursor: number; source: string };

const AUTOSAVE_KEY = 'silicio.autosave';

export const REGISTER_LIST = [...REGISTER_NAMES, 'CS', 'DS', 'SS', 'ES', 'IP'] as const;
export const FLAG_LIST = ['CF', 'PF', 'AF', 'ZF', 'SF', 'OF'] as const;
export const BUFFER_STAGES = ['CPU prepara', 'GPU procesa', 'CPU recibe'];
export const BUS_LIST = [
  { id: 'address', name: 'Direcciones', detail: 'Selecciona qué ubicación será leída o escrita.' },
  { id: 'data', name: 'Datos', detail: 'Transporta el valor de la transferencia.' },
  { id: 'control', name: 'Control', detail: 'Indica la operación y coordina su realización.' },
];

export { INSTRUMENT_PARTS };

/**
 * Session state shared by the console instruments, the 3D bench and the toolbar. The 8086 core and
 * its worker stay outside Angular; this service only projects and commands them.
 */
/** Message for a DIV/IDIV that cannot complete; the 8086 would raise INT 0. */
const divisionFault = (line: number) =>
  'Error de división (línea ' + line + '): el divisor es 0 o el cociente no cabe. El 8086 real lanzaría INT 0.';

@Injectable({ providedIn: 'root' })
export class LabSession {
  private readonly zone = inject(NgZone);
  private readonly coordinator = inject(SimulationCoordinator);
  readonly memoryLesson = inject(MemoryLessonService);
  /** The PC exercise of «La máquina». */
  readonly pc = inject(PcSession);
  readonly cpu = new Cpu8086();
  readonly missions = LAB_MISSIONS;
  readonly registerNames = REGISTER_LIST;
  readonly flagNames = FLAG_LIST;
  readonly busNames = BUS_LIST;
  readonly bufferStages = BUFFER_STAGES;
  readonly section = signal<Section>('atrium');
  readonly tab = signal<Tab>('state');
  readonly activePart = signal('lid');
  readonly exploded = signal(true);
  readonly viewMode = signal<'material' | 'wireframe'>('material');
  readonly inspection = signal(false);
  readonly manipulate = signal(false);
  readonly memoryModel = signal<'classic' | 'dimm'>('classic');
  readonly signalChannel = signal('ALE');
  readonly lampOn = signal(true);
  readonly lampTarget = signal<LampTarget>({ x: -0.8, z: 0.6, height: 5 });
  readonly reduced = signal(false);
  readonly quality = signal<Quality>('balanced');
  readonly sound = signal(false);
  /** The single clock lives in the coordinator; this is its running flag for the scene and the console. */
  readonly running = this.coordinator.running.asReadonly();
  readonly error = signal('');
  /** INT 21h service that is waiting for a key; the step is not taken until the key arrives. */
  readonly waitingInput = signal<0x01 | 0x0a | undefined>(undefined);
  readonly revision = signal(0);
  readonly tick = signal(0);
  readonly cursor = signal(-1);
  readonly branches = signal<Branch[]>([]);
  readonly loadedSource = signal('');
  readonly missionIndex = signal(0);
  /** Source lines that stop the run before their instruction. */
  readonly breakpoints = signal<ReadonlySet<number>>(new Set());
  /** Step of the cycle (0–6) being explained for the instruction on screen; undefined shows the confirmed state. */
  readonly explaining = signal<number | undefined>(undefined);
  /** Switches of the 8255 trainer (port B); they survive a restart so the student can run again with the same ones. */
  readonly switches = signal(0);
  /** The student's guess for the mission on screen, kept to compare with the result. */
  readonly prediction = signal('');
  readonly bus = signal('address');
  readonly bufferStage = signal(0);
  readonly baseline = signal<Snapshot | undefined>(undefined);
  readonly baselineText = signal('');
  readonly segment = signal(0x2000);
  readonly offset = signal(10);
  readonly selectablePieces = signal<PieceOption[]>([]);
  /** Piece positions and camera azimuth reported by the scene, read by the bench map. */
  readonly anchors = signal<PieceAnchor[]>([]);
  readonly cameraView = signal<CameraView>({ azimuth: 0.5, distance: 15 });
  /** Floating legends over the main pieces (key T). */
  readonly callouts = signal(false);
  readonly calloutAnchors = signal<ScreenAnchor[]>([]);
  /** Which HUD drawers are open; kept across stations and saved with the preferences. */
  readonly hud = signal<{ map: boolean; tray: boolean }>({ map: false, tray: false });
  /** Phase of the instruction journey being shown; the scene and the transport read it. */
  readonly phase = signal<Phase>('idle');
  /** How far the chip is opened, 0 to 100 percent. */
  readonly explodeAmount = signal(100);
  readonly bufferExperiment = new BufferExperiment();
  source = MISSIONS[0].source;
  segmentText = '2000';
  offsetText = '000A';
  wordText = '0005';
  private audio?: AudioContext;
  private engineWorker?: Worker;
  readonly state = computed(() => {
    this.revision();
    return this.cpu.snapshot();
  });
  /** What the instruments show: the confirmed state, or the state as of the step being explained. */
  readonly presentation = computed<StepPresentation | undefined>(() => {
    const index = this.cursor();
    const event = index >= 0 ? this.trace()[index] : undefined;
    return event ? presentStep(event, { sessionId: '8086-' + this.laboratoryFacade.session(), revision: index }) : undefined;
  });
  readonly shownState = computed<Snapshot>(() => {
    const step = this.explaining();
    const presentation = this.presentation();
    return step !== undefined && presentation ? presentation.projection(step) : this.state();
  });
  /** Screen and keyboard as of what is shown. */
  readonly io = computed(() => this.shownState().io);
  /** Source line of the next instruction, and whether a breakpoint stops before it. */
  readonly nextLine = computed(() => {
    this.revision();
    const ip = this.cpu.registers.IP;
    return this.cpu.instructions.find((i) => i.address === ip)?.line;
  });
  readonly atBreakpoint = computed(() => {
    const line = this.nextLine();
    return line !== undefined && this.breakpoints().has(line) && !this.cpu.halted;
  });
  readonly trace = computed(() => {
    this.revision();
    return [...this.cpu.trace];
  });
  readonly laboratoryFacade: LaboratoryFacade = new LaboratoryFacade({
    snapshot: () => this.shownState(),
    event: () => (this.cursor() >= 0 ? this.trace()[this.cursor()] : undefined),
    selection: () => this.activePart(),
    experience: () => this.section(),
  });
  readonly laboratory = this.laboratoryFacade.view;
  /** Revision of the executed step the activity belongs to. */
  private stepSerial = 0;
  private phaseTimer?: ReturnType<typeof setTimeout>;
  /** Conceptual contrast switch of the SoC station: separate memories with a copy between them. */
  readonly separateMemory = signal(false);
  /** True once the student (or a saved preference) picked a graphics profile; automatic hints stay out then. */
  qualityChosen = false;
  /** Information for the student that is not an error (autosave recovered or discarded). */
  readonly notice = signal('');
  private autosaveTimer?: ReturnType<typeof setTimeout>;
  /** Cache mission (M09). The lesson object is mutable, so a revision signal announces its changes. */
  cacheLesson = new CacheLesson();
  readonly cacheRevision = signal(0);
  readonly cacheSource = signal<'mission' | 'last'>('mission');
  /** Exhibition mode: index of the step on screen, or null when it is off. */
  readonly tourIndex = signal<number | null>(null);
  /** Snapshot of the real state for the per-station missions. */
  readonly missionContext = computed<MissionContext>(() => {
    this.revision();
    const view = this.bufferView();
    return {
      segment: this.segment(),
      offset: this.offset(),
      physical: this.physical(),
      trace: this.trace().map((t) => ({
        changed: (Object.keys(t.after.registers) as (keyof Registers)[]).filter(
          (r) => t.before.registers[r] !== t.after.registers[r],
        ),
      })),
      cursor: this.cursor(),
      bufferStage: this.bufferStage(),
      bufferCompleted: view.completed,
      bufferVersion: view.version,
      separateMemory: this.separateMemory(),
      pcMonitor: this.pc.state().monitor.text,
      pcResultFile: this.pc.fileText('resultado.txt') ?? '',
    };
  });
  readonly activity = computed<StationActivity>(() => {
    if (this.section() === 'apple') {
      const view = this.bufferView();
      return projectBufferActivity(
        {
          stage: this.bufferStage() as 0 | 1 | 2,
          completed: view.completed,
          separate: this.separateMemory(),
          version: view.version,
        },
        this.laboratory().sessionId,
        this.tick(),
      );
    }
    if (this.section() === 'machine') {
      this.pc.revision();
      return {
        ...IDLE_ACTIVITY,
        sessionId: this.laboratory().sessionId,
        revision: this.pc.stepCount(),
        phase: this.pc.powered() ? 'execute' : 'idle',
        pc: pcSceneActivity(this.pc.state(), this.pc.events(), this.pc.focus()),
      };
    }
    if (this.section() === 'memory') {
      this.revision();
      return {
        ...IDLE_ACTIVITY,
        sessionId: this.laboratory().sessionId,
        revision: this.revision(),
        phase: 'execute',
        memory: {
          ...projectMemory(this.segment(), this.offset(), (a) => this.memoryByte(a), {
            segment: this.cpu.registers.SS,
            pointer: this.cpu.registers.SP,
          }),
          cache: { lines: 8, last: this.cacheLessonLast() },
        },
      };
    }
    return projectActivity(this.laboratory() as never, this.phase(), this.revision(), this.explaining());
  });
  readonly lastReads = computed(() => this.laboratory().accesses.some((a) => a.kind === 'read'));
  readonly lastWrites = computed(() => this.laboratory().accesses.some((a) => a.kind === 'write'));
  /** Bumped when the mosaic or the memory mode changes, so the views of the experiment follow. */
  readonly bufferRevision = signal(0);
  readonly bufferNotice = signal('');
  readonly bufferView = computed(() => {
    this.bufferStage();
    this.bufferRevision();
    return this.bufferExperiment.view;
  });
  readonly comparison = computed(() => {
    this.revision();
    const a = this.baseline(),
      b = this.state();
    if (!a) return [];
    return [
      ...this.registerNames
        .filter((r) => a.registers[r] !== b.registers[r])
        .map((r) => ({ name: r, a: hex(a.registers[r]), b: hex(b.registers[r]) })),
      ...this.flagNames
        .filter((f) => a.flags[f] !== b.flags[f])
        .map((f) => ({ name: f, a: String(+a.flags[f]), b: String(+b.flags[f]) })),
      ...new Set([...Object.keys(a.memory), ...Object.keys(b.memory)]),
    ].flatMap((x) =>
      typeof x === 'object'
        ? [x]
        : (a.memory[+x] ?? 0) !== (b.memory[+x] ?? 0)
          ? [
              {
                name: 'M[' + hex(+x, 5) + ']',
                a: hex(a.memory[+x] ?? 0, 2),
                b: hex(b.memory[+x] ?? 0, 2),
              },
            ]
          : [],
    );
  });
  readonly catalogPieces = computed(() =>
    this.selectablePieces().length
      ? this.selectablePieces()
      : accessibleCatalog(this.section(), this.memoryModel(), this.trace().length),
  );
  readonly selectedDescription = computed(() =>
    describePiece(this.activePart(), this.cells(), this.catalogPieces()),
  );
  readonly historyView = computed(() =>
    this.trace().map((t) => ({
      address: t.instruction.address,
      text: t.instruction.text,
      ax: t.after.registers.AX,
      changed: (Object.keys(t.after.registers) as (keyof Registers)[])
        .filter((r) => t.before.registers[r] !== t.after.registers[r] && r !== 'IP')
        .join(' '),
    })),
  );
  /** Cursor, step count and the latest archived alternative, for the chronoscope tape. */
  readonly timeline = computed<TimelineState>(() => {
    const trace = this.trace();
    const texts = trace.map((t) => t.instruction.text);
    const archived = this.branches().at(-1);
    const other = archived?.trace.map((t) => t.instruction.text) ?? [];
    return {
      cursor: this.cursor(),
      total: trace.length,
      branch: archived ? { origin: forkOrigin(texts, other), texts: other.slice(forkOrigin(texts, other)) } : undefined,
    };
  });
  readonly missionComplete = computed(() => {
    this.revision();
    const mission = this.missions[this.missionIndex()];
    const registers = this.state().registers;
    if (mission.expect)
      return (
        this.source === mission.source &&
        this.state().halted &&
        meetsExpectation(mission.expect, this.state(), this.cpu.program?.data ?? [])
      );
    return (
      this.source === mission.source &&
      this.state().halted &&
      registers.AX === mission.answer &&
      (this.missionIndex() !== 4 || registers.BX === 1) &&
      (this.missionIndex() !== 5 || registers.BX === 0x1234) &&
      (this.missionIndex() !== 6 || registers.BX === 9) &&
      (this.missionIndex() !== 7 || this.state().flags.CF) &&
      (this.missionIndex() !== 8 || (registers.BX === 10 && registers.SP === 0xfffe))
    );
  });
  readonly aliasAddress = computed(() =>
    this.offset() < 16
      ? { segment: (this.segment() + 65535) % 65536, offset: this.offset() + 16 }
      : { segment: (this.segment() + 1) % 65536, offset: this.offset() - 16 },
  );
  readonly physical = computed(() => physicalAddress(this.segment(), this.offset()));

  /** One byte of the memory the activity works on: the exercise's own bytes, or the 8086 as it is shown. */
  memoryByte(address: number): number {
    this.memoryLesson.revision();
    if (this.memoryLesson.origin() === 'exercise' && this.section() === 'memory')
      return this.memoryLesson.exercise.byte(address);
    return this.shownState().memory[address & 0xfffff] ?? 0;
  }

  /** The word at the address on screen (low byte first). */
  readonly wordAtAddress = computed(() => {
    const at = this.physical();
    return joinWord(this.memoryByte(at), this.memoryByte(at + 1));
  });

  /** One step of the open exercise: write a low byte, a high byte and read the word; or reveal an address step. */
  advanceMemory(): void {
    const m = this.memoryLesson;
    if (m.activity() === 'store') {
      const value = parseInt(m.value(), 16);
      if (Number.isNaN(value)) {
        this.error.set('Escribe la palabra en hexadecimal (hasta cuatro dígitos).');
        return;
      }
      const { low, high } = splitWord(value);
      const at = this.physical();
      const step = m.progress().store;
      if (step === 0) this.writeMemoryByte(at, low);
      else if (step === 1) this.writeMemoryByte(at + 1, high);
      this.activePart.set('cell-' + ((at + step) & 31));
    }
    m.advance();
  }

  private resetMemoryLesson(): void {
    const m = this.memoryLesson;
    if (m.activity() === 'store' && m.origin() === 'exercise') m.exercise.clear();
    m.reset();
  }

  /** Writes one byte in the memory the activity works on. In the 8086 session this is an explicit edit: it pauses. */
  private writeMemoryByte(address: number, value: number): void {
    if (this.memoryLesson.origin() === 'exercise') {
      const word = this.memoryLesson.exercise;
      word.writeByte(address, value);
      this.memoryLesson.revision.update((n) => n + 1);
      return;
    }
    this.pause();
    this.cpu.memory[address & 0xfffff] = value & 255;
    this.revision.update((n) => n + 1);
  }
  readonly cells = computed(() => {
    this.revision();
    const base = this.physical() & ~31;
    return Array.from({ length: 32 }, (_, index) => ({
      address: base + index,
      value: this.memoryByte(base + index),
    }));
  });

  constructor() {
    this.coordinator.register(
      new Cpu8086Controller({
        nextInstruction: () => this.nextInstruction(),
        nextPhase: () => this.nextPhase(),
        back: () => this.back(),
        backPhase: () => this.backPhase(),
        explaining: () => this.explaining(),
        breakpointLine: () => (this.atBreakpoint() ? this.nextLine() : undefined),
        phaseLabel: (index: number) => COURSE_PHASES[index].group + ' ' + COURSE_PHASES[index].number + '/7',
        load: () => this.load(),
        cancelStep: () => this.cancelStep(),
        halted: () => this.state().halted,
        cursor: () => this.cursor(),
        waitingInput: () => this.waitingInput(),
        error: () => this.error(),
      }),
    );
    this.coordinator.register(
      new PcController({
        step: () => this.pc.step(),
        back: () => this.pc.back(),
        nextTransfer: () => this.pc.nextTransfer(),
        backTransfer: () => this.pc.backTransfer(),
        focus: () => this.pc.focus(),
        eventCount: () => this.pc.events().length,
        resetExercise: () => this.pc.resetExercise(),
        canBack: () => this.pc.canBack(),
        stepCount: () => this.pc.stepCount(),
        halted: () => this.pc.halted(),
        powered: () => this.pc.powered(),
        waiting: () => this.pc.waiting(),
        message: () => this.pc.message(),
      }),
    );
    this.coordinator.register(
      new SocController({
        stage: () => this.bufferStage(),
        lastStage: 2,
        advance: () => this.nextBuffer(),
        reset: () => this.resetBuffer(),
      }),
    );
    this.coordinator.register(
      new MemoryLessonController({
        step: () => (this.memoryLesson.activity() === 'cache' ? (this.cacheRevision(), this.cacheLesson.revealed) : this.memoryLesson.step()),
        total: () => (this.memoryLesson.activity() === 'cache' ? (this.cacheRevision(), this.cacheLesson.total) : STEPS_OF[this.memoryLesson.activity()]),
        waiting: () =>
          this.memoryLesson.activity() === 'cache' && (this.cacheRevision(), this.cacheLesson.total > 0 && !this.cacheLesson.complete)
            ? 'Predice acierto o fallo'
            : undefined,
        advance: () => this.advanceMemory(),
        reset: () => this.resetMemoryLesson(),
      }),
    );
    this.cpu.load(this.source);
    this.loadedSource.set(this.source);
    effect(() => {
      this.revision();
      this.branches();
      this.cursor();
      this.missionIndex();
      untracked(() => this.scheduleAutosave());
    });
  }

  /** Enables the off-thread engine; without a Worker, steps run synchronously on the main thread. */
  attachWorker(): void {
    if (typeof Worker === 'undefined') return;
    try {
      this.engineWorker = new Worker(new URL('../simulation/cpu8086.worker', import.meta.url));
      this.engineWorker.onmessage = ({ data }) => {
        const applied = this.laboratoryFacade.complete(data.generation, () =>
          this.zone.run(() => {
            if (data.error) {
              this.error.set(data.error);
              this.pause();
              return;
            }
            this.waitingInput.set(data.waiting);
            if (data.fault !== undefined) {
              this.error.set(divisionFault(data.fault));
              this.pause();
              return;
            }
            if (data.waiting !== undefined) return;
            if (data.event) {
              this.archiveFuture();
              this.cpu.restore(data.event.after);
              this.cpu.trace.push(data.event);
              this.commitStep(data.event);
            }
          }),
        );
        void applied;
        this.settleStep();
      };
      this.engineWorker.onerror = () => {
        this.pause();
        this.error.set('El motor de ejecución se detuvo. Recarga la página para recuperarlo.');
      };
    } catch {
      this.engineWorker = undefined;
    }
  }

  /** Restores saved preferences; `prefersReduced` is the system setting when nothing was saved. */
  loadPreferences(prefersReduced: boolean, narrow: boolean): void {
    try {
      const saved = JSON.parse(localStorage.getItem('silicio.preferences') ?? '{}');
      if (saved.quality === 'low' || saved.quality === 'high' || saved.quality === 'balanced') {
        this.quality.set(saved.quality);
        this.qualityChosen = true;
      }
      if (!saved.quality && narrow) this.quality.set('balanced');
      this.reduced.set(saved.reduced ?? prefersReduced);
      if (saved.hud) this.hud.set({ map: !!saved.hud.map, tray: !!saved.hud.tray });
    } catch {
      this.reduced.set(prefersReduced);
    }
  }

  dispose(): void {
    this.engineWorker?.terminate();
    void this.audio?.close();
    this.pause();
  }

  /** Piece selection, including the side effects that open an assembly or toggle an element. */
  part(id: string): void {
    this.activePart.set(id);
    if (INSTRUMENT_PARTS.includes(id)) {
      this.exploded.set(true);
      if (this.explodeAmount() === 0) this.explodeAmount.set(100);
    }
    if (id === 'lamp') this.inspection.set(!this.inspection());
    if (id === 'scope') this.signalChannel.set(this.signalChannel() === 'ALE' ? 'RD' : 'ALE');
    if (id.startsWith('cell-')) {
      this.offsetText = hex(
        ((this.physical() & ~31) + Number(id.slice(5)) - this.segment() * 16) & 0xffff,
      );
      this.setAddress();
    }
    if (id.startsWith('frame-') && this.cpu.trace.length)
      this.restore(Math.min(Number(id.slice(6)), this.cpu.trace.length - 1));
    if (id === 'initial') this.restore(-1);
  }

  /** Scene toolbar commands that only change session or display state; camera moves stay in the scene. */
  applySceneState(command: SceneCommand): void {
    switch (command) {
      case 'explode':
        this.exploded.set(!this.exploded());
        break;
      case 'representation':
        this.viewMode.set(this.viewMode() === 'material' ? 'wireframe' : 'material');
        break;
      case 'light':
        this.inspection.set(!this.inspection());
        break;
      case 'manipulate':
        this.manipulate.set(!this.manipulate());
        break;
      case 'lamp-power':
        this.lampOn.set(!this.lampOn());
        break;
      case 'callouts':
        this.callouts.set(!this.callouts());
        break;
      case 'tour':
        this.tourIndex.set(this.tourIndex() === null ? 0 : null);
        break;
      case 'tray':
        this.setHud({ tray: !this.hud().tray });
        break;
      case 'map':
        this.setHud({ map: !this.hud().map });
        break;
    }
  }

  intent(command: 'step' | 'run' | 'pause' | 'load' | 'back'): void {
    if (command === 'step') void this.coordinator.step();
    else if (command === 'run') this.coordinator.toggle();
    else if (command === 'pause') this.pause();
    else if (command === 'load') this.load();
    else this.back();
  }

  chooseMission(index: number): void {
    this.missionIndex.set(index);
    const switches = this.missions[index].switches;
    if (switches !== undefined) this.switches.set(switches);
    this.prediction.set('');
    this.breakpoints.set(new Set());
    this.source = this.missions[index].source;
    this.load();
  }

  load(): void {
    this.pause();
    this.error.set('');
    try {
      this.cpu.load(this.source);
      if (this.switches()) this.cpu.setSwitches(this.switches());
      this.laboratoryFacade.beginSession();
      this.loadedSource.set(this.source);
      this.explaining.set(undefined);
      this.waitingInput.set(undefined);
      this.cursor.set(-1);
      this.branches.set([]);
      this.baseline.set(undefined);
      this.baselineText.set('');
      this.revision.update((n) => n + 1);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  /** Resolves when the step has been applied, answered with a wait or an error, or discarded by a pause. */
  step(): Promise<void> {
    if (this.source !== this.loadedSource()) {
      this.error.set('Compila el programa editado antes de ejecutarlo.');
      this.pause();
      return Promise.resolve();
    }
    this.error.set('');
    if (this.engineWorker) {
      const generation = this.laboratoryFacade.request();
      if (generation === undefined) return this.stepAnswer ?? Promise.resolve();
      const answer = new Promise<void>((resolve) => (this.stepResolve = resolve));
      this.stepAnswer = answer;
      this.engineWorker.postMessage({
        generation,
        state: this.cpu.snapshot(),
        instructions: this.cpu.instructions,
      });
      return answer;
    }
    try {
      this.archiveFuture();
      const result = this.cpu.execute();
      this.waitingInput.set(result.kind === 'waiting-input' ? result.service : undefined);
      if (result.kind === 'fault') throw Error(divisionFault(result.line));
      if (result.kind !== 'waiting-input' && 'trace' in result && result.trace) this.commitStep(result.trace);
    } catch (e) {
      this.error.set((e as Error).message);
      this.pause();
    }
    return Promise.resolve();
  }

  private stepResolve?: () => void;
  private stepAnswer?: Promise<void>;
  private settleStep(): void {
    this.stepResolve?.();
    this.stepResolve = undefined;
    this.stepAnswer = undefined;
  }

  private commitStep(event: Trace): void {
    this.playTick();
    this.cursor.set(this.cpu.trace.length - 1);
    this.tick.update((n) => n + 1);
    this.activePart.set(event.reads.length || event.writes.length ? 'biu' : 'alu');
    this.revision.update((n) => n + 1);
    if (this.explainNext) this.showCoursePhase(0);
    else {
      this.explaining.set(undefined);
      this.playPhases();
    }
    if (this.cpu.halted) this.pause();
  }

  private explainNext = false;
  private static readonly SCENE_PHASE: readonly Phase[] = ['fetch', 'fetch', 'decode', 'execute', 'execute', 'write', 'write'];

  /** Shows step `index` (0–6) of the cycle for the instruction on screen; nothing is executed again. */
  private showCoursePhase(index: number): void {
    clearTimeout(this.phaseTimer);
    this.stepSerial++;
    this.explaining.set(index);
    this.phase.set(LabSession.SCENE_PHASE[index]);
    this.activePart.set(COURSE_PHASES[index].pieces[0]);
    this.tick.update((n) => n + 1);
  }

  /** Grain «phase»: the next step of the cycle, executing the following instruction after the seventh. */
  nextPhase(): Promise<void> {
    const at = this.explaining();
    if (at !== undefined && at < 6) {
      this.showCoursePhase(at + 1);
      return Promise.resolve();
    }
    this.explaining.set(undefined);
    this.explainNext = true;
    return this.step().finally(() => (this.explainNext = false));
  }

  /** Grain «instruction»: leaving an explanation shows the confirmed state first. */
  nextInstruction(): Promise<void> {
    this.explaining.set(undefined);
    this.explainNext = false;
    return this.step();
  }

  backPhase(): void {
    const at = this.explaining();
    if (at !== undefined && at > 0) {
      this.showCoursePhase(at - 1);
      return;
    }
    if (at === undefined && this.cursor() >= 0) {
      this.showCoursePhase(5);
      return;
    }
    this.restore(this.cursor() - 1);
    if (this.cursor() >= 0) this.showCoursePhase(6);
  }

  /** Shows step `index` of the cycle on request (a click on the list of steps). */
  explainAt(index: number): void {
    if (this.cursor() >= 0) this.showCoursePhase(index);
  }

  /** Opens the memory view on a variable of the program. */
  selectVariable(v: { name: string; address: number }): void {
    this.segment.set(this.cpu.registers.DS);
    this.segmentText = hex(this.cpu.registers.DS);
    this.offsetText = hex(v.address);
    this.setAddress();
  }

  toggleBreakpoint(line: number): void {
    this.breakpoints.update((set) => {
      const next = new Set(set);
      if (!next.delete(line)) next.add(line);
      return next;
    });
  }

  /** Moves the switches of the trainer; the next `IN` from port B reads them. */
  setSwitches(value: number): void {
    this.switches.set(value & 255);
    this.cpu.setSwitches(value & 255);
    this.revision.update((n) => n + 1);
  }

  /** Types into the emulated keyboard; an instruction waiting for a key can then go on. */
  typeKeys(text: string): void {
    if (!text) return;
    this.cpu.type(text);
    this.waitingInput.set(undefined);
    this.error.set('');
    this.revision.update((n) => n + 1);
  }

  /**
   * Walks the instruction through fetch, decode, execute and write so each can be watched. Under reduced
   * motion, and when a run is going fast, it lands on the final phase instead of replaying the journey.
   */
  playPhases(): void {
    clearTimeout(this.phaseTimer);
    this.stepSerial++;
    if (this.reduced() || this.cursor() < 0) {
      this.phase.set(this.cursor() < 0 ? 'idle' : 'write');
      return;
    }
    const serial = this.stepSerial;
    const unit = this.running() ? 70 : 260;
    let index = 0;
    const next = () => {
      if (serial !== this.stepSerial) return;
      this.phase.set(PHASES[index++]);
      if (index < PHASES.length) this.phaseTimer = setTimeout(next, unit);
    };
    next();
  }

  /** Stops the journey on a chosen phase so it can be explained; the transport buttons call this. */
  showPhase(phase: Phase): void {
    clearTimeout(this.phaseTimer);
    this.stepSerial++;
    this.phase.set(phase);
  }

  /** Stops the clock; the coordinator also calls `cancelStep` on the engine it owns. */
  pause(): void {
    this.coordinator.pause();
    this.cancelStep();
  }

  /** Drops the step still being answered by the worker, if any. */
  cancelStep(): void {
    this.laboratoryFacade.cancel();
    this.settleStep();
  }

  restore(index: number): void {
    this.pause();
    if (index < 0) {
      if (this.cpu.trace[0]) this.cpu.restore(this.cpu.trace[0].before);
    } else if (this.cpu.trace[index]) this.cpu.restore(this.cpu.trace[index].after);
    this.cursor.set(index);
    this.revision.update((n) => n + 1);
    clearTimeout(this.phaseTimer);
    this.stepSerial++;
    this.explaining.set(undefined);
    this.phase.set(index < 0 ? 'idle' : 'write');
    this.activePart.set('frame-' + Math.max(0, index));
  }

  back(): void {
    this.restore(this.cursor() - 1);
  }

  restoreBranch(id: string): void {
    const b = this.branches().find((branch) => branch.id === id);
    if (!b) return;
    this.pause();
    this.archiveCurrentBranch();
    this.cpu.load(b.source);
    this.source = b.source;
    this.loadedSource.set(b.source);
    this.cpu.trace = structuredClone(b.trace);
    this.cpu.restore(b.state);
    this.cursor.set(b.cursor);
    this.revision.update((n) => n + 1);
  }

  /** Keeps the future of the current timeline before a restored branch replaces it. */
  private archiveCurrentBranch(): void {
    if (!this.cpu.trace.length) return;
    const trace = structuredClone(this.cpu.trace),
      state = this.cpu.snapshot(),
      cursor = this.cursor(),
      source = this.loadedSource();
    this.branches.update((bs) => [
      ...bs.slice(-7),
      { id: 'rama-' + Date.now() + '-' + bs.length, trace, state, cursor, source },
    ]);
  }

  private archiveFuture(): void {
    if (this.cursor() >= this.cpu.trace.length - 1) return;
    const trace = structuredClone(this.cpu.trace);
    this.branches.update((bs) => [
      ...bs.slice(-7),
      {
        id: 'rama-' + Date.now() + '-' + bs.length,
        trace,
        state: trace.at(-1)!.after,
        cursor: trace.length - 1,
        source: this.loadedSource(),
      },
    ]);
    this.cpu.trace.splice(this.cursor() + 1);
  }

  capture(): void {
    const snapshot = this.cpu.snapshot();
    this.baseline.set(snapshot);
    this.baselineText.set(
      'Rama A · AX=' + hex(snapshot.registers.AX) + ' · DS=' + hex(snapshot.registers.DS),
    );
    this.revision.update((n) => n + 1);
  }

  editRegister(name: keyof Registers, text: string): void {
    this.pause();
    const value = this.parseHex(text);
    if (value === undefined) return;
    this.cpu.registers[name] = value;
    this.revision.update((n) => n + 1);
  }

  setAddress(): void {
    const segment = this.parseHex(this.segmentText),
      offset = this.parseHex(this.offsetText);
    if (segment === undefined || offset === undefined) return;
    this.segment.set(segment);
    this.offset.set(offset);
    this.wordText = hex(this.cpu.readWord(segment, offset));
    this.activePart.set('cell-' + (this.physical() & 31));
  }

  selectCell(address: number): void {
    this.offsetText = hex((address - this.segment() * 16) & 0xffff);
    this.setAddress();
  }

  writeMemory(): void {
    this.pause();
    const v = this.parseHex(this.wordText);
    if (v === undefined) return;
    this.cpu.writeWord(this.segment(), this.offset(), v);
    this.revision.update((n) => n + 1);
  }

  /** Shared or separate memory: changing it restarts the dependency, since the copies differ. */
  setBufferMode(mode: 'shared' | 'separate'): void {
    this.bufferExperiment.setMode(mode);
    this.separateMemory.set(mode === 'separate');
    this.bufferStage.set(0);
    this.bufferNotice.set('');
    this.bufferRevision.update((n) => n + 1);
  }

  /** A new mosaic for the dependency (typed here or received from the PC). Throws if it is not 64 values of 0–255. */
  setBufferTile(values: readonly number[]): void {
    this.bufferExperiment.setInput(values);
    this.bufferStage.set(0);
    this.bufferNotice.set('');
    this.bufferRevision.update((n) => n + 1);
    this.tick.update((n) => n + 1);
  }

  /** The CPU asks for B1 before the GPU said it was done: the answer is a wait, not a value. */
  readBufferEarly(): void {
    const r = this.bufferExperiment.readOutput();
    this.bufferNotice.set(r.kind === 'waiting' ? r.reason : 'B1 es válido: la CPU ya puede recibir la imagen.');
  }

  get bufferCopies() {
    this.bufferRevision();
    this.bufferStage();
    return this.bufferExperiment.copies;
  }

  resetBuffer(): void {
    this.bufferExperiment.reset();
    this.bufferStage.set(0);
    this.bufferNotice.set('');
    this.bufferRevision.update((n) => n + 1);
    this.activePart.set('performance');
    this.tick.update((n) => n + 1);
  }

  nextBuffer(): void {
    this.bufferExperiment.advance();
    const next = this.bufferExperiment.view.stage;
    this.bufferStage.set(next);
    this.activePart.set(next === 1 ? 'gpu' : next === 2 ? 'unified' : 'performance');
    this.tick.update((n) => n + 1);
  }

  private cacheLessonLast(): { index: number; hit: boolean } | undefined {
    this.cacheRevision();
    const last = this.cacheLesson.lastLookup;
    // The scene shows the eight-line cache, so the line index comes from that configuration.
    const n = this.cacheLesson.revealed - 1;
    const access = this.cacheLesson.eight.accesses[n];
    return last && access ? { index: access.index, hit: access.hit } : undefined;
  }

  predictCache(hit: boolean): void {
    this.cacheLesson = this.cacheLesson.clone();
    this.cacheLesson.predict(hit);
    this.cacheRevision.update((n) => n + 1);
  }

  resetCache(): void {
    this.cacheLesson = this.cacheLesson.clone();
    this.cacheLesson.reset();
    this.cacheRevision.update((n) => n + 1);
  }

  /** `last` replays the reads of the latest 8086 run; `mission` is the fixed four-read trace. */
  setCacheSource(source: 'mission' | 'last'): void {
    this.cacheSource.set(source);
    this.cacheLesson =
      source === 'mission'
        ? new CacheLesson()
        : new CacheLesson(this.cpu.trace.flatMap((t) => t.reads).slice(0, 24));
    this.cacheRevision.update((n) => n + 1);
  }

  setReduced(value: boolean): void {
    this.reduced.set(value);
    this.savePreferences();
  }

  setHud(patch: Partial<{ map: boolean; tray: boolean }>): void {
    this.hud.update((h) => {
      const next = { ...h, ...patch };
      // On a phone the scene is short: one drawer at a time.
      if (typeof matchMedia === 'function' && matchMedia('(max-width: 899px)').matches) {
        if (patch.map) next.tray = false;
        else if (patch.tray) next.map = false;
      }
      return next;
    });
    this.savePreferences();
  }

  setQuality(value: Quality): void {
    this.qualityChosen = true;
    this.quality.set(value);
    this.savePreferences();
  }

  private savePreferences(): void {
    try {
      localStorage.setItem(
        'silicio.preferences',
        JSON.stringify({ quality: this.quality(), reduced: this.reduced(), hud: this.hud() }),
      );
    } catch {}
  }

  toggleSound(): void {
    this.sound.set(!this.sound());
    if (this.sound()) {
      try {
        this.audio ??= new AudioContext();
        void this.audio.resume();
        this.playTick();
      } catch {
        this.sound.set(false);
      }
    }
  }

  private playTick(): void {
    if (!this.sound() || !this.audio) return;
    const o = this.audio.createOscillator(),
      g = this.audio.createGain();
    o.frequency.value = 460;
    g.gain.setValueAtTime(0.035, this.audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.audio.currentTime + 0.06);
    o.connect(g);
    g.connect(this.audio.destination);
    o.start();
    o.stop(this.audio.currentTime + 0.07);
  }

  async importSession(file: File): Promise<void> {
    this.pause();
    this.error.set('');
    try {
      if (file.size > 12_000_000) throw Error('La sesión supera 12 MB.');
      this.restoreFromText(await file.text());
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  /** Applies a serialized session (file import or autosave). Throws before any change if it is invalid. */
  private restoreFromText(text: string): void {
    const session = readSession(text);
    this.cpu.load(session.source);
    this.laboratoryFacade.beginSession();
    this.cpu.restore(session.state);
    this.cpu.trace = session.trace;
    this.source = session.source;
    this.loadedSource.set(session.source);
    this.cursor.set(session.cursor);
    this.missionIndex.set(session.missionIndex);
    this.branches.set(
      (session.branches ?? []).map((b) => ({
        id: b.id,
        source: b.session.source,
        state: b.session.state,
        trace: b.session.trace,
        cursor: b.session.cursor,
      })),
    );
    this.baseline.set(session.baseline);
    this.baselineText.set(
      session.baseline ? 'Rama A importada · AX=' + hex(session.baseline.registers.AX) : '',
    );
    this.revision.update((n) => n + 1);
  }

  /** The session as the v2 codec writes it: current timeline plus archived branches. */
  serializeSession(pretty = false): string {
    return JSON.stringify(
      {
        version: 2,
        current: {
          version: 1,
          source: this.loadedSource(),
          state: this.state(),
          trace: this.trace(),
          cursor: this.cursor(),
          missionIndex: this.missionIndex(),
          baseline: this.baseline(),
        },
        branches: this.branches().map((b) => ({
          id: b.id,
          session: {
            version: 1,
            source: b.source,
            state: b.state,
            trace: b.trace,
            cursor: b.cursor,
            missionIndex: this.missionIndex(),
          },
        })),
      },
      null,
      pretty ? 2 : undefined,
    );
  }

  /** Saves the session a moment after the last change. Storage failures never reach the student. */
  private scheduleAutosave(): void {
    clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => {
      try {
        if (!this.cpu.trace.length && !this.branches().length && this.source === MISSIONS[0].source) {
          localStorage.removeItem(AUTOSAVE_KEY);
          return;
        }
        const text = this.serializeSession();
        if (text.length > 4_000_000) return;
        localStorage.setItem(AUTOSAVE_KEY, text);
      } catch {
        /* storage may be blocked or full */
      }
    }, 600);
  }

  /** Brings back the autosaved session; a damaged one is thrown away with a visible notice. */
  restoreAutosave(): boolean {
    let text: string | null = null;
    try {
      text = localStorage.getItem(AUTOSAVE_KEY);
    } catch {
      return false;
    }
    if (!text) return false;
    try {
      this.restoreFromText(text);
      this.notice.set('Se recuperó tu última sesión.');
      return true;
    } catch {
      try {
        localStorage.removeItem(AUTOSAVE_KEY);
      } catch {
        /* nothing to clean */
      }
      this.notice.set('Se descartó un autoguardado dañado y se abrió una sesión nueva.');
      return false;
    }
  }

  exportSession(): void {
    this.pause();
    const blob = new Blob([this.serializeSession(true)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'silicio-sesion.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** Accepts one to four hexadecimal digits; anything else becomes a visible error. */
  parseHex(text: string): number | undefined {
    if (!/^[\da-f]{1,4}$/i.test(text)) {
      this.error.set('Usa de uno a cuatro dígitos hexadecimales (0000–FFFF).');
      return;
    }
    this.error.set('');
    return parseInt(text, 16);
  }

  readonly hex = hex;
}

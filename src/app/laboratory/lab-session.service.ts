import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import { Cpu8086, hex, physicalAddress, REGISTER_NAMES, Registers, Snapshot, Trace } from '../simulation/cpu8086';
import { readSession } from '../simulation/session-codec';
import { MISSIONS } from '../content/missions';
import { accessibleCatalog } from '../world/piece-definitions';
import type { Section } from '../world/scene-inputs';
import type { LampTarget } from '../world/lamp-limits';
import type { SceneCommand } from '../world/scene-toolbar/scene-toolbar.component';
import { BufferExperiment, LaboratoryFacade } from './laboratory.facade';
import { describePiece, type PieceOption } from './piece-descriptions';

export type Tab = 'state' | 'program' | 'trace';
export type Quality = 'high' | 'balanced' | 'low';
export type Branch = { id: string; trace: Trace[]; state: Snapshot; cursor: number; source: string };

export const REGISTER_LIST = [...REGISTER_NAMES, 'CS', 'DS', 'SS', 'ES', 'IP'] as const;
export const FLAG_LIST = ['CF', 'PF', 'AF', 'ZF', 'SF', 'OF'] as const;
export const BUFFER_STAGES = ['CPU prepara', 'GPU procesa', 'CPU recibe'];
export const BUS_LIST = [
  { id: 'address', name: 'Direcciones', detail: 'Selecciona qué ubicación será leída o escrita.' },
  { id: 'data', name: 'Datos', detail: 'Transporta el valor de la transferencia.' },
  { id: 'control', name: 'Control', detail: 'Indica la operación y coordina su realización.' },
];

const INSTRUMENT_PARTS = [
  'alu',
  'registers',
  'control',
  'biu',
  'queue',
  'performance',
  'efficiency',
  'gpu',
  'neural',
  'unified',
];

/**
 * Session state shared by the console instruments, the 3D bench and the toolbar. The 8086 core and
 * its worker stay outside Angular; this service only projects and commands them.
 */
@Injectable({ providedIn: 'root' })
export class LabSession {
  private readonly zone = inject(NgZone);
  readonly cpu = new Cpu8086();
  readonly missions = MISSIONS;
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
  readonly running = signal(false);
  readonly error = signal('');
  readonly revision = signal(0);
  readonly tick = signal(0);
  readonly cursor = signal(-1);
  readonly branches = signal<Branch[]>([]);
  readonly loadedSource = signal('');
  readonly missionIndex = signal(0);
  readonly bus = signal('address');
  readonly bufferStage = signal(0);
  readonly baseline = signal<Snapshot | undefined>(undefined);
  readonly baselineText = signal('');
  readonly segment = signal(0x2000);
  readonly offset = signal(10);
  readonly selectablePieces = signal<PieceOption[]>([]);
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
  readonly trace = computed(() => {
    this.revision();
    return [...this.cpu.trace];
  });
  readonly laboratoryFacade = new LaboratoryFacade({
    snapshot: () => this.state(),
    event: () => (this.cursor() >= 0 ? this.trace()[this.cursor()] : undefined),
    selection: () => this.activePart(),
    experience: () => this.section(),
  });
  readonly laboratory = this.laboratoryFacade.view;
  readonly lastReads = computed(() => this.laboratory().accesses.some((a) => a.kind === 'read'));
  readonly lastWrites = computed(() => this.laboratory().accesses.some((a) => a.kind === 'write'));
  readonly bufferView = computed(() => {
    this.bufferStage();
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
    })),
  );
  readonly missionComplete = computed(() => {
    this.revision();
    const mission = this.missions[this.missionIndex()];
    const registers = this.state().registers;
    return (
      this.source === mission.source &&
      this.state().halted &&
      registers.AX === mission.answer &&
      (this.missionIndex() !== 4 || registers.BX === 1) &&
      (this.missionIndex() !== 5 || registers.BX === 0x1234) &&
      (this.missionIndex() !== 6 || registers.BX === 9) &&
      (this.missionIndex() !== 7 || this.state().flags.CF)
    );
  });
  readonly aliasAddress = computed(() =>
    this.offset() < 16
      ? { segment: (this.segment() + 65535) % 65536, offset: this.offset() + 16 }
      : { segment: (this.segment() + 1) % 65536, offset: this.offset() - 16 },
  );
  readonly physical = computed(() => physicalAddress(this.segment(), this.offset()));
  readonly cells = computed(() => {
    this.revision();
    const base = this.physical() & ~31;
    return Array.from({ length: 32 }, (_, index) => ({
      address: base + index,
      value: this.cpu.memory[base + index] ?? 0,
    }));
  });

  constructor() {
    this.cpu.load(this.source);
    this.loadedSource.set(this.source);
  }

  /** Enables the off-thread engine; without a Worker, steps run synchronously on the main thread. */
  attachWorker(): void {
    if (typeof Worker === 'undefined') return;
    try {
      this.engineWorker = new Worker(new URL('../simulation/cpu8086.worker', import.meta.url));
      this.engineWorker.onmessage = ({ data }) => {
        this.laboratoryFacade.complete(data.generation, () =>
          this.zone.run(() => {
            if (data.error) {
              this.error.set(data.error);
              this.pause();
              return;
            }
            if (data.event) {
              this.archiveFuture();
              this.cpu.restore(data.event.after);
              this.cpu.trace.push(data.event);
              this.commitStep(data.event);
            }
          }),
        );
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
      if (saved.quality === 'low' || saved.quality === 'high' || saved.quality === 'balanced')
        this.quality.set(saved.quality);
      if (!saved.quality && narrow) this.quality.set('balanced');
      this.reduced.set(saved.reduced ?? prefersReduced);
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
    if (INSTRUMENT_PARTS.includes(id)) this.exploded.set(true);
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
    }
  }

  intent(command: 'step' | 'run' | 'pause' | 'load' | 'back'): void {
    if (command === 'step') this.step();
    else if (command === 'run') this.run();
    else if (command === 'pause') this.pause();
    else if (command === 'load') this.load();
    else this.back();
  }

  chooseMission(index: number): void {
    this.missionIndex.set(index);
    this.source = this.missions[index].source;
    this.load();
  }

  load(): void {
    this.pause();
    this.error.set('');
    try {
      this.cpu.load(this.source);
      this.laboratoryFacade.beginSession();
      this.loadedSource.set(this.source);
      this.cursor.set(-1);
      this.branches.set([]);
      this.baseline.set(undefined);
      this.baselineText.set('');
      this.revision.update((n) => n + 1);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  step(): void {
    if (this.source !== this.loadedSource()) {
      this.error.set('Compila el programa editado antes de ejecutarlo.');
      this.pause();
      return;
    }
    this.error.set('');
    if (this.engineWorker) {
      const generation = this.laboratoryFacade.request();
      if (generation === undefined) return;
      this.engineWorker.postMessage({
        generation,
        state: this.cpu.snapshot(),
        instructions: this.cpu.instructions,
      });
      return;
    }
    try {
      this.archiveFuture();
      const event = this.cpu.step();
      if (event) this.commitStep(event);
    } catch (e) {
      this.error.set((e as Error).message);
      this.pause();
    }
  }

  private commitStep(event: Trace): void {
    this.playTick();
    this.cursor.set(this.cpu.trace.length - 1);
    this.tick.update((n) => n + 1);
    this.activePart.set(event.reads.length || event.writes.length ? 'biu' : 'alu');
    this.revision.update((n) => n + 1);
    if (this.cpu.halted) this.pause();
  }

  run(): void {
    if (this.running()) {
      this.pause();
      return;
    }
    if (this.state().halted) return;
    this.running.set(true);
    let count = 0;
    this.timer = setInterval(() => {
      if (count++ >= 2048) {
        this.error.set('Pausa automática: límite de 2048 pasos. Inspecciona el bucle.');
        this.pause();
        return;
      }
      this.step();
    }, 450);
  }
  private timer?: ReturnType<typeof setInterval>;

  pause(): void {
    clearInterval(this.timer);
    this.laboratoryFacade.cancel();
    this.running.set(false);
  }

  restore(index: number): void {
    this.pause();
    if (index < 0) {
      if (this.cpu.trace[0]) this.cpu.restore(this.cpu.trace[0].before);
    } else if (this.cpu.trace[index]) this.cpu.restore(this.cpu.trace[index].after);
    this.cursor.set(index);
    this.revision.update((n) => n + 1);
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

  nextBuffer(): void {
    this.bufferExperiment.advance();
    const next = this.bufferExperiment.view.stage;
    this.bufferStage.set(next);
    this.activePart.set(next === 1 ? 'gpu' : next === 2 ? 'unified' : 'performance');
    this.tick.update((n) => n + 1);
  }

  transferBus(id: string): void {
    this.bus.set(id);
    this.activePart.set(id === 'control' ? 'io' : id === 'data' ? 'ram' : 'cpu');
    this.tick.update((n) => n + 1);
  }

  setReduced(value: boolean): void {
    this.reduced.set(value);
    this.savePreferences();
  }

  setQuality(value: Quality): void {
    this.quality.set(value);
    this.savePreferences();
  }

  private savePreferences(): void {
    try {
      localStorage.setItem(
        'silicio.preferences',
        JSON.stringify({ quality: this.quality(), reduced: this.reduced() }),
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
      const session = readSession(await file.text());
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
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  exportSession(): void {
    this.pause();
    const blob = new Blob(
      [
        JSON.stringify(
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
          2,
        ),
      ],
      { type: 'application/json' },
    );
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

import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { gsap } from 'gsap';
import Lenis from 'lenis';
import { AtriumSceneComponent } from './world/atrium-scene.component';
import type { Section } from './world/atrium-scene.component';
import { projectLaboratory, BufferExperiment } from './laboratory/laboratory.facade';
import { SceneControlsComponent, SceneCommand } from './world/scene-controls.component';
import { readSession } from './simulation/session-codec';
import { PIN_NAMES } from './world/cpu-pins';
import {
  Cpu8086,
  hex,
  physicalAddress,
  REGISTER_NAMES,
  Registers,
  Snapshot,
  Trace,
} from './simulation/cpu8086';

const EXPERIENCES = [
  {
    id: '8086' as Section,
    number: '01',
    title: 'Banco 8086',
    subtitle: 'La máquina desnuda',
    summary: 'Haz que una instrucción atraviese registros, memoria y unidad aritmética.',
    accent: '#cf9c65',
  },
  {
    id: 'memory' as Section,
    number: '02',
    title: 'Memoria',
    subtitle: 'Geografía de los datos',
    summary: 'Dos números forman una dirección. Explora dónde terminan realmente tus bytes.',
    accent: '#99ae9d',
  },
  {
    id: 'time' as Section,
    number: '03',
    title: 'Cronoscopio',
    subtitle: 'El pasado es editable',
    summary: 'Detén una ejecución, vuelve a su origen y cambia una decisión.',
    accent: '#aca3ba',
  },
  {
    id: 'apple' as Section,
    number: '04',
    title: 'Apple Silicon',
    subtitle: 'Un territorio compartido',
    summary: 'Abre un sistema en un chip y sigue un buffer entre CPU y GPU.',
    accent: '#a0b4bf',
  },
  {
    id: 'machine' as Section,
    number: '05',
    title: 'La máquina',
    subtitle: 'Tres conversaciones',
    summary: 'Direcciones, datos y control: encuentra el propósito de cada conexión.',
    accent: '#c7ac6b',
  },
];
const MISSIONS = [
  {
    title: '01 / Sigue una suma',
    source: 'ADD AX, [10]\nHLT',
    goal: 'AX empieza en 7. La palabra en DS:000A vale 5. El resultado debe ser 12 sin escribir en memoria.',
    answer: 12,
  },
  {
    title: '02 / El límite invisible',
    source: 'MOV AX, 0FFFFh\nADD AX, 1\nHLT',
    goal: 'Suma uno a FFFFh. Compara CF y OF: el acarreo sin signo no implica desbordamiento con signo.',
    answer: 0,
  },
  {
    title: '03 / Un signo cambia',
    source: 'MOV AX, 07FFFh\nADD AX, 1\nHLT',
    goal: '7FFFh + 1 produce 8000h. Observa OF=1 y CF=0.',
    answer: 0x8000,
  },
  {
    title: '04 / Cuatro palabras',
    source: 'MOV AX, 0\nMOV CX, 4\nMOV SI, 0\notra:\nADD AX, [SI]\nADD SI, 2\nLOOP otra\nHLT',
    goal: 'Acumula las palabras 1, 2, 3 y 4. LOOP modifica CX y conserva los flags.',
    answer: 10,
  },
  {
    title: '05 / Dos caminos',
    source: 'MOV AX, 7\nCMP AX, 7\nJZ iguales\nMOV BX, 99\nJMP fin\niguales:\nMOV BX, 1\nfin:\nHLT',
    goal: 'CMP no cambia AX. Modifica la comparación y observa cuál de los dos caminos se ejecuta.',
    answer: 7,
  },
  {
    title: '06 / La huella de una palabra',
    source: 'MOV AX, 01234h\nMOV [32], AX\nMOV BX, [32]\nHLT',
    goal: '1234h se guarda como 34h y 12h en direcciones consecutivas. BX debe recuperar 1234h.',
    answer: 0x1234,
  },
  {
    title: '07 / BP encuentra la pila',
    source: 'MOV BP, 10\nMOV AX, 9\nMOV [BP], AX\nMOV BX, [BP]\nHLT',
    goal: 'BP utiliza SS por defecto. Guarda 9 en SS:000A y comprueba que BX recupera ese valor; DS conserva otra región.',
    answer: 9,
  },
  {
    title: '08 / Conservar un acarreo',
    source: 'MOV AX, 0FFFFh\nADD AX, 1\nINC AX\nDEC AX\nHLT',
    goal: 'La suma activa CF. INC y DEC modifican otros flags pero conservan ese acarreo. AX termina en 0000h.',
    answer: 0,
  },
];
const CHECKPOINTS: Record<
  string,
  { question: string; options: string[]; correct: number; explanation: string }
> = {
  '8086': {
    question: '¿Qué modifica CMP AX, 7?',
    options: ['AX y la memoria', 'Los flags, conservando AX', 'Solo el segmento DS'],
    correct: 1,
    explanation:
      'CMP calcula una resta para actualizar flags y descarta el resultado. Un salto condicional puede usar esos flags.',
  },
  memory: {
    question: '¿Cómo queda 1234h en memoria little endian?',
    options: ['12h y después 34h', '34h y después 12h', 'Un único byte 1234h'],
    correct: 1,
    explanation: 'Una palabra tiene dos bytes. El menos significativo ocupa la dirección menor.',
  },
  time: {
    question: '¿Qué recupera una instantánea del laboratorio?',
    options: ['Solo la imagen del chip', 'Registros, flags y memoria', 'El tiempo eléctrico real'],
    correct: 1,
    explanation:
      'La instantánea restaura el estado lógico. Esta simulación no reproduce la temporización eléctrica del procesador.',
  },
  apple: {
    question: '¿Qué sigue siendo necesario al compartir memoria?',
    options: [
      'Sincronizar los accesos',
      'Copiar siempre todos los datos',
      'Eliminar el planificador',
    ],
    correct: 0,
    explanation:
      'CPU y GPU pueden compartir almacenamiento; una dependencia debe completarse antes de que otra unidad use su resultado.',
  },
  machine: {
    question: '¿Qué bus transporta el valor leído de RAM?',
    options: ['Direcciones', 'Datos', 'Control'],
    correct: 1,
    explanation:
      'Direcciones selecciona la ubicación; control indica la operación; datos lleva el valor transferido.',
  },
};
const DESCRIPTIONS: Record<string, string> = {
  lid: 'El encapsulado protege el circuito integrado y conduce sus señales hacia 40 terminales. La muesca y la marca del pin 1 permiten orientar el componente correctamente.',
  socket:
    'El zócalo permite montar y sustituir el procesador sin soldar directamente sus terminales. Sus contactos conectan cada pin con las pistas de la placa didáctica.',
  clock:
    'La señal CLK marca el avance de los ciclos del procesador. El ritmo del reloj no equivale al número de instrucciones por segundo: cada instrucción puede necesitar varios ciclos.',
  alu: 'La unidad aritmético-lógica opera sobre los operandos de 16 bits. ADD y SUB producen un resultado y actualizan los flags aritméticos.',
  registers:
    'AX, BX, CX y DX guardan valores de 16 bits. El simulador también incluye SP, BP, SI y DI.',
  control:
    'La unidad de ejecución interpreta instrucciones, coordina operandos y decide el siguiente paso.',
  biu: 'La unidad de interfaz de bus forma direcciones físicas y comunica el procesador con memoria y entrada/salida.',
  queue:
    'El 8086 tiene una cola de prelectura de seis bytes. Este modelo muestra su ubicación conceptual; no simula los tiempos eléctricos de prefetch.',
  performance:
    'Los núcleos de rendimiento ejecutan trabajo exigente. Esta distribución es una representación conceptual, no una fotografía del die de un modelo concreto.',
  efficiency:
    'Los núcleos de eficiencia atienden trabajo con un perfil de consumo diferente. El planificador decide cómo repartirlo.',
  gpu: 'La GPU procesa trabajo paralelo. En el ejemplo recibe el buffer compartido después de que la CPU termine de prepararlo.',
  neural:
    'El Neural Engine acelera operaciones compatibles de aprendizaje automático. No toda operación de IA se ejecuta aquí.',
  unified:
    'CPU y GPU pueden acceder a un mismo conjunto de memoria. Compartir almacenamiento no elimina la necesidad de sincronizar el acceso.',
  cpu: 'El procesador busca instrucciones, interpreta operaciones y transforma datos.',
  ram: 'La memoria principal conserva instrucciones y datos mientras la máquina está encendida.',
  io: 'La entrada/salida comunica la máquina con su entorno. Una operación necesita dirección, datos y señales de control.',
};
@Component({
  selector: 'app-root',
  imports: [FormsModule, RouterLink, AtriumSceneComponent, SceneControlsComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements AfterViewInit, OnDestroy {
  @ViewChild('world') world?: {
    rotate(direction: number): void;
    zoom(direction: number): void;
    resetView(): void;
    focusSelected(): void;
    resetTools(): void;
    dropTool(): void;
  };
  @ViewChild('scrollPanel', { static: true }) scrollPanel!: ElementRef<HTMLElement>;
  @ViewChild('panelContent', { static: true }) panelContent!: ElementRef<HTMLElement>;
  readonly branches = signal<
    { id: string; trace: Trace[]; state: Snapshot; cursor: number; source: string }[]
  >([]);
  readonly layout = signal<'scene' | 'shared' | 'instrument'>('shared');
  setLayout(mode: 'scene' | 'shared' | 'instrument'): void {
    this.layout.set(mode);
    this.manipulate.set(false);
    this.lenis?.resize();
  }
  restoreBranch(id: string): void {
    const b = this.branches().find((b) => b.id === id);
    if (!b) return;
    this.pause();
    if (this.cpu.trace.length) {
      const trace = structuredClone(this.cpu.trace),
        state = this.cpu.snapshot(),
        cursor = this.cursor(),
        source = this.loadedSource();
      this.branches.update((bs) => [
        ...bs.slice(-7),
        { id: 'rama-' + Date.now() + '-' + bs.length, trace, state, cursor, source },
      ]);
    }
    this.cpu.load(b.source);
    this.source = b.source;
    this.loadedSource.set(b.source);
    this.cpu.trace = structuredClone(b.trace);
    this.cpu.restore(b.state);
    this.cursor.set(b.cursor);
    this.revision.update((n) => n + 1);
  }
  readonly tab = signal<'state' | 'program' | 'trace'>('state');
  readonly manipulate = signal(false);
  readonly inspection = signal(false);
  readonly memoryModel = signal<'classic' | 'dimm'>('classic');
  readonly registerSelected = signal<keyof Registers>('AX');
  readonly selectedBit = signal(0);
  readonly signalChannel = signal('ALE');
  readonly bufferExperiment = new BufferExperiment();
  readonly bufferView = computed(() => {
    this.bufferStage();
    return this.bufferExperiment.view;
  });
  readonly lastReads = computed(() => this.laboratory().accesses.some((a) => a.kind === 'read'));
  readonly lastWrites = computed(() => this.laboratory().accesses.some((a) => a.kind === 'write'));
  readonly laboratory = computed(() =>
    projectLaboratory(this.state(), this.cursor() >= 0 ? this.trace()[this.cursor()] : undefined),
  );
  readonly registerView = computed(
    () => this.laboratory().registers.find((r) => r.name === this.registerSelected())!,
  );
  readonly comparison = computed(() => {
    this.revision();
    const a = this.baseline,
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
  readonly selectablePieces = signal<{ id: string; name: string }[]>([]);
  readonly benchPieces = [
    { id: 'scope', name: 'Osciloscopio' },
    { id: 'power', name: 'Fuente' },
    { id: 'lamp', name: 'Lámpara' },
    { id: 'probe', name: 'Sonda' },
    { id: 'cable', name: 'Cable coaxial' },
    { id: 'tool', name: 'Herramienta' },
    { id: 'passives', name: 'Desacoplo' },
    { id: 'supports', name: 'Soportes' },
  ];
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
  readonly experiences = EXPERIENCES;
  readonly missions = MISSIONS;
  readonly sections = signal<Section>('atrium');
  readonly current = computed(() => this.experiences.find((e) => e.id === this.sections()));
  readonly activePart = signal('lid');
  readonly exploded = signal(true);
  readonly reduced = signal(false);
  readonly quality = signal<'high' | 'low'>('high');
  readonly revision = signal(0);
  readonly tick = signal(0);
  readonly running = signal(false);
  readonly error = signal('');
  readonly loadedSource = signal('');
  readonly missionIndex = signal(0);
  readonly cursor = signal(-1);
  readonly bufferStage = signal(0);
  readonly bus = signal('address');
  readonly bufferStages = ['CPU prepara', 'GPU procesa', 'CPU recibe'];
  readonly busNames = [
    {
      id: 'address',
      name: 'Direcciones',
      detail: 'Selecciona qué ubicación será leída o escrita.',
    },
    { id: 'data', name: 'Datos', detail: 'Transporta el valor de la transferencia.' },
    { id: 'control', name: 'Control', detail: 'Indica la operación y coordina su realización.' },
  ];
  readonly cpu = new Cpu8086();
  readonly registerNames = [...REGISTER_NAMES, 'CS', 'DS', 'SS', 'ES', 'IP'] as const;
  readonly flagNames = ['CF', 'PF', 'AF', 'ZF', 'SF', 'OF'] as const;
  readonly state = computed(() => {
    this.revision();
    return this.cpu.snapshot();
  });
  readonly trace = computed(() => {
    this.revision();
    return [...this.cpu.trace];
  });
  readonly selectedDescription = computed(() => {
    const id = this.activePart();
    if (id.startsWith('pin-')) {
      const n = Number(id.slice(4)),
        name = PIN_NAMES[n - 1];
      const role = name?.startsWith('AD')
        ? 'Línea multiplexada: transporta una dirección en una fase del ciclo y datos en otra.'
        : name?.startsWith('A1')
          ? 'Línea superior de dirección; también comunica información de estado según la fase del ciclo.'
          : name === 'VCC'
            ? 'Alimentación del procesador.'
            : name === 'GND'
              ? 'Referencia eléctrica y retorno de la alimentación.'
              : name === 'CLK'
                ? DESCRIPTIONS['clock']
                : name === 'ALE'
                  ? 'Permite capturar la dirección en un latch antes de reutilizar las líneas multiplexadas como bus de datos.'
                  : name === 'RESET'
                    ? 'Inicializa el procesador cuando se aplica la secuencia eléctrica requerida.'
                    : name === 'NMI' || name === 'INTR'
                      ? 'Entrada de petición de interrupción; NMI y INTR tienen reglas distintas de habilitación.'
                      : 'Señal de coordinación de bus. Su función depende de la configuración de modo y del ciclo de transferencia.';
      return (
        'Pin ' +
        n +
        ' · ' +
        name +
        '. ' +
        role +
        ' Nombres del diagrama en modo mínimo; algunas señales son activas en nivel bajo.'
      );
    }
    if (id.startsWith('cell-')) {
      const cell = this.cells()[Number(id.slice(5))];
      return cell
        ? 'Dirección física ' +
            hex(cell.address, 5) +
            'h · byte ' +
            hex(cell.value, 2) +
            'h. Vista lógica del estado del 8086; la geometría no es una celda DRAM física.'
        : 'Ventana lógica de bytes del 8086.';
    }
    return (
      (
        {
          'memory-board':
            'Placa didáctica de 128 KiB por dos bancos de 64 KiB, presentada para explicar el bus de 16 bits del 8086. No representa una placa comercial ni toda la memoria direccionable.',
          spd: 'EEPROM de detección de presencia serie (SPD): informa al sistema de las características y temporizaciones del módulo DDR4.',
          'dimm-socket':
            'Conector del DIMM: la llave impide invertir el módulo. Las pestañas retienen sus extremos.',
          scope:
            'Osciloscopio: captura didáctica de dirección, lectura y escritura. Los pasos no representan tiempos eléctricos medidos.',
          power:
            'Fuente regulada: VCC y GND alimentan el circuito. Una tensión incorrecta puede dañar hardware real; este visor no modela electricidad.',
          lamp: 'Luz de inspección para reconocer contactos y superficies. Pulsa para cambiar la iluminación.',
          probe: 'La sonda lleva una señal al instrumento sin sustituir la referencia de masa.',
          cable:
            'El conductor central transporta la señal; la pantalla exterior ofrece retorno y reduce interferencia.',
          tool: 'Manipulación física: la herramienta puede caer sobre su bandeja. No modifica registros ni bytes.',
          passives:
            'Los condensadores de desacoplo suministran corriente cerca del integrado y reducen perturbaciones de alimentación.',
          supports: 'Los separadores evitan que la cara inferior de la placa toque el banco.',
          'bank-even':
            'Banco par: ocho chips × 65 536 bits = 64 KiB. Conecta D0–D7; A0 selecciona el byte par.',
          'bank-odd':
            'Banco impar: ocho chips × 65 536 bits = 64 KiB. Conecta D8–D15; BHE# habilita el byte alto.',
          dimm: 'Kingston KVR26N19S8/8: 8 GB, DDR4-2666, 1Rx8, ocho encapsulados FBGA y 288 contactos. No es memoria compatible con el 8086.',
        } as Record<string, string>
      )[id] ??
      (id.startsWith('dram-')
        ? 'Intel 2164A: DRAM de 65 536 × 1 bit en DIP de 16 pines. Ocho circuitos forman un banco de un byte.'
        : id.startsWith('dimm-chip-')
          ? 'Componente FBGA 1G × 8 bits. Ocho componentes forman el rango de 64 bits del módulo.'
          : undefined) ??
      DESCRIPTIONS[id] ??
      'Selecciona una pieza en la escena o utiliza los controles del inspector.'
    );
  });
  readonly pins = PIN_NAMES.map((name, i) => ({
    id: 'pin-' + (i + 1),
    label: i + 1 + ' / ' + name,
  }));
  readonly historyView = computed(() =>
    this.trace().map((t) => ({
      address: t.instruction.address,
      text: t.instruction.text,
      ax: t.after.registers.AX,
    })),
  );
  readonly viewMode = signal<'material' | 'wireframe'>('material');
  readonly checkpoint = computed(() => CHECKPOINTS[this.sections()]);
  readonly answers = signal<Record<string, number>>({});
  readonly checkpointAnswer = computed(() => this.answers()[this.sections()]);
  readonly checkpointCorrect = computed(
    () => this.checkpointAnswer() === this.checkpoint()?.correct,
  );
  answerCheckpoint(index: number): void {
    this.answers.update((a) => ({ ...a, [this.sections()]: index }));
  }
  readonly sound = signal(false);
  private audio?: AudioContext;
  readonly missionComplete = computed(
    () =>
      this.source === this.missions[this.missionIndex()].source &&
      this.state().halted &&
      this.state().registers.AX === this.missions[this.missionIndex()].answer &&
      (this.missionIndex() !== 4 || this.state().registers.BX === 1) &&
      (this.missionIndex() !== 5 || this.state().registers.BX === 0x1234) &&
      (this.missionIndex() !== 6 || this.state().registers.BX === 9) &&
      (this.missionIndex() !== 7 || this.state().flags.CF),
  );
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
  readonly segment = signal(0x2000);
  readonly offset = signal(10);
  source = MISSIONS[0].source;
  segmentText = '2000';
  offsetText = '000A';
  wordText = '0005';
  baseline: Snapshot | undefined;
  baselineText = signal('');
  private engineWorker?: Worker;
  private generation = 0;
  private busy = false;
  private timer?: ReturnType<typeof setInterval>;
  private navigation?: Subscription;
  private lenis?: Lenis;
  private context?: gsap.Context;
  private media?: MediaQueryList;
  private ticker = (seconds: number) => this.lenis?.raf(seconds * 1000);
  private mediaChanged = () => {
    this.reduced.set(this.media?.matches ?? false);
    if (this.reduced()) {
      this.lenis?.stop();
      this.context?.revert();
    } else this.lenis?.start();
  };
  constructor(
    private router: Router,
    private host: ElementRef<HTMLElement>,
    private zone: NgZone,
  ) {
    this.cpu.load(this.source);
    this.loadedSource.set(this.source);
    this.navigation = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        this.pause();
        const route = this.router.url.split('?')[0].split('/')[1] as Section;
        this.sections.set(this.experiences.some((e) => e.id === route) ? route : 'atrium');
        this.activePart.set(
          route === 'apple'
            ? 'performance'
            : route === 'machine'
              ? 'cpu'
              : route === '8086'
                ? 'alu'
                : route === 'memory'
                  ? this.memoryModel() === 'classic'
                    ? 'bank-even'
                    : 'dimm'
                  : route === 'time'
                    ? 'initial'
                    : 'lid',
        );
        this.scrollPanel?.nativeElement.scrollTo(0, 0);
      });
  }
  ngAfterViewInit(): void {
    if (typeof Worker !== 'undefined') {
      try {
        this.engineWorker = new Worker(new URL('./simulation/cpu8086.worker', import.meta.url));
        this.engineWorker.onmessage = ({ data }) => {
          if (data.generation !== this.generation) return;
          this.busy = false;
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
          });
        };
        this.engineWorker.onerror = () => {
          this.busy = false;
          this.pause();
          this.error.set('El motor de ejecución se detuvo. Recarga la página para recuperarlo.');
        };
      } catch {
        this.engineWorker = undefined;
      }
    }
    this.media = matchMedia('(prefers-reduced-motion: reduce)');
    try {
      const saved = JSON.parse(localStorage.getItem('silicio.preferences') ?? '{}');
      if (saved.quality === 'low' || saved.quality === 'high') this.quality.set(saved.quality);
      this.reduced.set(saved.reduced ?? this.media.matches);
    } catch {
      this.reduced.set(this.media.matches);
    }
    this.media.addEventListener('change', this.mediaChanged);
    this.zone.runOutsideAngular(() => {
      if (!matchMedia('(max-width:899px)').matches)
        this.lenis = new Lenis({
          wrapper: this.scrollPanel.nativeElement,
          content: this.panelContent.nativeElement,
          autoRaf: false,
          duration: 0.85,
          prevent: (node) => node.tagName === 'TEXTAREA',
        });
      gsap.ticker.add(this.ticker);
      if (this.reduced()) this.lenis?.stop();
      else
        this.context = gsap.context(() => {
          gsap
            .timeline({ defaults: { duration: 0.8, ease: 'power3.out' } })
            .from('.title-block', { y: 18, opacity: 0 }, 0)
            .from('.experience-nav a', { y: 10, opacity: 0, stagger: 0.06 }, 0.2);
        }, this.host.nativeElement);
    });
  }
  editorFocus(): void {
    if (matchMedia('(max-width:899px)').matches) this.setLayout('instrument');
  }
  sceneCommand(command: SceneCommand): void {
    switch (command) {
      case 'rotate-left':
        this.world?.rotate(-1);
        break;
      case 'rotate-right':
        this.world?.rotate(1);
        break;
      case 'zoom-in':
        this.world?.zoom(0.85);
        break;
      case 'zoom-out':
        this.world?.zoom(1.15);
        break;
      case 'reset':
        this.world?.resetView();
        break;
      case 'focus':
        this.world?.focusSelected();
        break;
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
      case 'drop':
        this.world?.dropTool();
        break;
      case 'reset-tools':
        this.world?.resetTools();
        break;
    }
  }
  part(id: string): void {
    this.activePart.set(id);
    if (id === 'lamp') this.inspection.set(!this.inspection());
    if (id === 'scope') this.signalChannel.set(this.signalChannel() === 'ALE' ? 'RD' : 'ALE');
    if (id === 'tool') this.world?.dropTool();
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
      this.loadedSource.set(this.source);
      this.cursor.set(-1);
      this.branches.set([]);
      this.baseline = undefined;
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
      if (this.busy) return;
      this.busy = true;
      this.engineWorker.postMessage({
        generation: this.generation,
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
  pause(): void {
    clearInterval(this.timer);
    this.generation++;
    this.busy = false;
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
  capture(): void {
    this.baseline = this.cpu.snapshot();
    this.baselineText.set(
      'Rama A · AX=' + hex(this.baseline.registers.AX) + ' · DS=' + hex(this.baseline.registers.DS),
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
  private parseHex(text: string): number | undefined {
    if (!/^[\da-f]{1,4}$/i.test(text)) {
      this.error.set('Usa de uno a cuatro dígitos hexadecimales (0000–FFFF).');
      return;
    }
    this.error.set('');
    return parseInt(text, 16);
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
    if (value) {
      this.lenis?.stop();
      this.context?.revert();
    } else this.lenis?.start();
    this.savePreferences();
  }
  setQuality(value: 'high' | 'low'): void {
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
  async importSession(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    if (!file) return;
    this.pause();
    this.error.set('');
    try {
      if (file.size > 12_000_000) throw Error('La sesión supera 12 MB.');
      const session = readSession(await file.text());
      this.cpu.load(session.source);
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
      this.baseline = session.baseline;
      this.baselineText.set(
        session.baseline ? 'Rama A importada · AX=' + hex(session.baseline.registers.AX) : '',
      );
      this.revision.update((n) => n + 1);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      input.value = '';
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
              baseline: this.baseline,
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
  h = hex;
  ngOnDestroy(): void {
    this.engineWorker?.terminate();
    void this.audio?.close();
    this.pause();
    this.navigation?.unsubscribe();
    this.context?.revert();
    gsap.ticker.remove(this.ticker);
    this.lenis?.destroy();
    this.media?.removeEventListener('change', this.mediaChanged);
  }
}

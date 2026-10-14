import { PIN_NAMES } from './cpu-pins';
import type { PieceDefinition } from './interaction-registry';
const names: Record<string, [string, string]> = {
  'bank-even': [
    'Banco par · D0–D7',
    'Ocho Intel2164A forman un banco de64KiB. A0 distingue el byte de dirección par.',
  ],
  'bank-odd': [
    'Banco impar · D8–D15',
    'Ocho Intel2164A forman un banco de64KiB. BHE# habilita el byte alto del bus.',
  ],
  'memory-board': [
    'Placa y ventana de memoria',
    'La placa didáctica contiene128KiB. La ventana lógica de32bytes inspecciona el estado del8086 en una escala separada.',
  ],
  cpu: [
    'Procesador',
    'Busca instrucciones y transforma datos siguiendo las operaciones del programa.',
  ],
  ram: [
    'Memoria de trabajo',
    'Almacena palabras que pueden leerse o escribirse usando una dirección.',
  ],
  io: [
    'Entrada y salida',
    'Comunica el sistema con dispositivos. Control distingue la operación que se solicita.',
  ],
  lid: [
    'Tapa del integrado',
    'Protege el circuito y sus enlaces. El despiece permite inspeccionar la organización funcional.',
  ],
  socket: ['Zócalo y contactos', 'Sujeta el encapsulado y conecta sus terminales con la placa.'],
  clock: [
    'Oscilador de referencia',
    'El reloj organiza los ciclos del procesador. La animación del laboratorio no reproduce frecuencia eléctrica.',
  ],
  board: [
    'Placa didáctica',
    'La placa conecta circuitos mediante pistas, contactos y referencias eléctricas. Su organización es educativa; no reproduce una placa comercial.',
  ],
  die: [
    'Dado de silicio',
    'El circuito integrado se fabrica sobre silicio. La vista funcional ampliada separa bloques para estudiar su función, no su posición física exacta.',
  ],
  encapsulation: [
    'Encapsulado cerámico',
    'La cavidad aloja el dado y los enlaces que conducen sus señales hacia los terminales.',
  ],
  interconnects: [
    'Enlaces internos',
    'Los enlaces metálicos conectan el circuito integrado con sus terminales externos.',
  ],
  traces: [
    'Pistas de cobre',
    'Las pistas transportan señales entre componentes. Dirección y dato son significados distintos aunque el8086 reutilice líneas.',
  ],
  'memory-packages': [
    'Encapsulados de memoria del SoC',
    'La memoria unificada comparte datos entre unidades. La colocación representada es conceptual; no es un plano físico del M5.',
  ],
  'latch-left': [
    'Pestaña izquierda',
    'Retiene el módulo mediante la muesca lateral. Pulsa para abrir o cerrar esta pestaña; la llave central determina la orientación del DIMM.',
  ],
  'latch-right': [
    'Pestaña derecha',
    'Retiene el módulo mediante la muesca lateral. Pulsa para abrir o cerrar esta pestaña; la llave central determina la orientación del DIMM.',
  ],
  logic: [
    'Circuitos de interfaz',
    'Latches y lógica de interfaz conservan direcciones y coordinan señales de la placa didáctica.',
  ],
  markings: [
    'Referencias de la placa',
    'La serigrafía identifica componentes y referencias de montaje; no representa valores almacenados.',
  ],
  passives: [
    'Desacoplo y terminación',
    'Condensadores y resistencias ayudan a estabilizar alimentación y señales cerca de los integrados.',
  ],
  scope: [
    'Osciloscopio',
    'Captura didáctica de la última operación. SeleccionaALE,RD oWR para observar la fase explicativa correspondiente.',
  ],
  power: [
    'Fuente de alimentación',
    '5V es una referencia ilustrativa para la placa clásica; este laboratorio no calcula corrientes ni simula fallos eléctricos.',
  ],
  cable: [
    'Cable coaxial',
    'El conductor central lleva la señal; la pantalla proporciona retorno y reduce interferencias.',
  ],
  probe: [
    'Sonda',
    'La sonda conecta el punto de prueba con el instrumento. Necesita referencia de masa.',
  ],
  supports: [
    'Separadores y fijaciones',
    'Mantienen la placa elevada y sujetan el conjunto sin apoyar la electrónica directamente sobre el banco.',
  ],
  'esd-mat': [
    'Alfombrilla antiestática',
    'Disipa la electricidad estática y protege la placa. Conserva marcas de uso; no es un plano de fabricación.',
  ],
  lamp: [
    'Lámpara articulada',
    'Brazo de dos segmentos con cabezal orientable. Arrastra el anillo de cobre o usa el panel de luz para iluminar otro punto; no modifica registros ni memoria.',
  ],
  multimeter: [
    'Multímetro digital',
    'Pulsa para cambiar el modo de medida en pantalla. Muestra la referencia de la fuente y no está conectado al circuito del 8086.',
  ],
  'solder-station': [
    'Estación de soldadura',
    'La punta calienta el estaño: el indicador y la camisa se encienden mientras dura el calentamiento. No mide temperatura ni modela el proceso térmico.',
  ],
  'solder-spool': [
    'Carrete de estaño',
    'Hilo con núcleo de flux. El flux limpia las superficies antes de fundir el estaño. Pulsa para hacerlo girar.',
  ],
  notebook: [
    'Cuaderno de medidas',
    'Registro escrito de las pruebas del banco. Pulsa para hojearlo y ver cómo se anota una sesión.',
  ],
  mug: [
    'Taza de café',
    'Objeto de uso cotidiano: su aro de café queda sobre la madera y muestra el desgaste del lugar de trabajo.',
  ],
  parts: [
    'Caja de componentes',
    'Resistencias y condensadores de reposición. Pulsa para abrir el cajón y revisar los valores etiquetados.',
  ],
  chips: [
    'Bandeja de integrados',
    'Circuitos DIP de reposición sobre espuma conductiva. Manipularlos sin protección puede dañarlos.',
  ],
  dimm: [
    'Módulo DIMM DDR4',
    'Módulo de memoria con ocho chips de datos y un chip SPD. La disposición es una aproximación didáctica del módulo.',
  ],
  'dimm-socket': [
    'Zócalo DIMM',
    'Conector de la placa que sujeta el módulo y conecta sus contactos dorados. La llave central impide girarlo.',
  ],
  spd: [
    'Chip SPD',
    'Memoria pequeña que describe al controlador las características del módulo al arrancar.',
  ],
  alu: [
    'Unidad aritmético-lógica',
    'Realiza las sumas, restas y operaciones lógicas de la ejecución y actualiza los indicadores.',
  ],
  registers: [
    'Banco de registros',
    'Registros de dieciséis bits donde la unidad de ejecución guarda operandos, punteros y segmentos.',
  ],
  control: [
    'Control',
    'Decodifica la instrucción y ordena qué bloque actúa en cada fase.',
  ],
  biu: [
    'Unidad de interfaz de bus',
    'Calcula direcciones físicas, busca instrucciones y accede a memoria y entrada/salida.',
  ],
  queue: [
    'Cola de instrucciones',
    'Almacena por adelantado los bytes de código que la unidad de ejecución consumirá.',
  ],
  performance: [
    'Núcleos de rendimiento',
    'Grupo de núcleos pensado para trabajo exigente. El recuento sigue la ficha pública del M5.',
  ],
  efficiency: [
    'Núcleos de eficiencia',
    'Grupo de núcleos pensado para tareas de bajo consumo. El recuento sigue la ficha pública del M5.',
  ],
  gpu: [
    'Procesador gráfico',
    'Procesa trabajo paralelo y lee los mismos datos de la memoria unificada que la CPU.',
  ],
  neural: [
    'Motor neuronal',
    'Unidad dedicada a operaciones de aprendizaje automático; su posición es conceptual.',
  ],
  unified: [
    'Memoria unificada',
    'Memoria compartida por CPU, GPU y motor neuronal. La disposición representada es conceptual.',
  ],
  initial: [
    'Estado inicial',
    'Estado de la sesión antes de ejecutar ninguna instrucción.',
  ],
  'pegboard-tools': [
    'Herramientas colgadas',
    'Destornilladores a la vista sobre el panel perforado. Pulsa para ver cómo oscilan al tocarlos.',
  ],
};
/** Bench objects that answer a click; each one is listed in the piece inspector too. */
const OPERABLE = new Set(['scope', 'power', 'lamp', 'probe', 'cable', 'esd-mat', 'multimeter', 'solder-station', 'solder-spool', 'notebook', 'mug', 'parts', 'chips', 'pegboard-tools']);
export function pieceDefinition(id: string, experience: string): PieceDefinition {
  let name = names[id]?.[0] ?? id.replaceAll('-', ' '),
    description = names[id]?.[1];
  if (id.startsWith('pin-')) {
    const n = Number(id.slice(4));
    name = 'Pin ' + n + ' · ' + PIN_NAMES[n - 1];
  }
  if (id.startsWith('dram-')) name = 'Intel2164A · ' + id.slice(5);
  if (id.startsWith('dimm-chip-')) name = 'FBGA1G×8 · chip ' + id.slice(10);
  if (id.startsWith('cell-')) name = 'Byte lógico ' + id.slice(5);
  if (id.startsWith('frame-')) name = 'Estado ' + id.slice(6);
  if (id.startsWith('tool')) {
    name = 'Herramienta ' + (id === 'tool' ? '1' : Number(id.slice(5)) + 1);
    description =
      'Manipulación física del banco: activaManipular para arrastrarla, o suéltala sobre su bandeja. No modifica el procesador.';
  }
  return {
    id,
    name,
    description,
    scope: OPERABLE.has(id) || id.startsWith('tool') || id === 'supports' ? 'bench' : 'model',
    role:
      id.startsWith('tool') || OPERABLE.has(id)
        ? 'operable'
        : 'academic',
    actions: ['inspect'],
    sourceRefs: [
      experience === 'apple'
        ? 'apple-m5-2025'
        : experience === 'memory'
          ? 'intel2164a-1982/kingston1595'
          : 'intel8086',
    ],
    modelFidelity: experience === 'apple' ? 'conceptual' : 'educational-assembly',
  };
}

/** Accessible model inventory exists even when the renderer cannot initialize. */
export function accessibleCatalog(
  experience: string,
  variant: 'classic' | 'dimm',
  historyLength: number,
): PieceDefinition[] {
  const environment = [
    'scope',
    'power',
    'lamp',
    'probe',
    'cable',
    'esd-mat',
    'multimeter',
    'solder-station',
    'solder-spool',
    'notebook',
    'mug',
    'parts',
    'chips',
    'pegboard-tools',
    'tool',
    'tool-1',
    'tool-2',
    'supports',
  ];
  let ids: string[] = [];
  if (experience === '8086' || experience === 'atrium')
    ids = [
      'lid',
      'socket',
      'clock',
      'alu',
      'registers',
      'control',
      'biu',
      'queue',
      'board',
      'encapsulation',
      'die',
      'interconnects',
      'traces',
      'logic',
      'passives',
      ...Array.from({ length: 40 }, (_, i) => 'pin-' + (i + 1)),
    ];
  else if (experience === 'memory')
    ids = [
      ...(variant === 'classic'
        ? [
            'memory-board',
            'bank-even',
            'bank-odd',
            ...Array.from({ length: 16 }, (_, i) => 'dram-' + Math.floor(i / 8) + '-' + (i % 8)),
          ]
        : [
            'dimm',
            'dimm-socket',
            'spd',
            'latch-left',
            'latch-right',
            ...Array.from({ length: 8 }, (_, i) => 'dimm-chip-' + i),
          ]),
      ...(variant === 'classic' ? Array.from({ length: 32 }, (_, i) => 'cell-' + i) : []),
    ];
  else if (experience === 'apple')
    ids = [
      'lid',
      'board',
      'performance',
      'efficiency',
      'gpu',
      'neural',
      'unified',
      'memory-packages',
    ];
  else if (experience === 'machine') ids = ['cpu', 'ram', 'io'];
  else
    ids = historyLength
      ? Array.from(
          { length: Math.min(16, historyLength) },
          (_, i) => 'frame-' + (Math.max(0, historyLength - 16) + i),
        )
      : ['initial'];
  return [...environment, ...ids].map((id) => pieceDefinition(id, experience));
}

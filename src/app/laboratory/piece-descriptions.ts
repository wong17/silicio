import { PIN_NAMES } from '../world/cpu-pins';
import { DESCRIPTIONS } from '../content/component-descriptions';
import { hex } from '../simulation/cpu8086';

export interface PieceOption {
  id: string;
  name: string;
  description?: string;
  scope?: 'model' | 'bench';
}

const PIN_ROLES: [test: (name: string) => boolean, text: string][] = [
  [
    (n) => n.startsWith('AD'),
    'Línea multiplexada: transporta una dirección en una fase del ciclo y datos en otra.',
  ],
  [
    (n) => n.startsWith('A1'),
    'Línea superior de dirección; también comunica información de estado según la fase del ciclo.',
  ],
  [(n) => n === 'VCC', 'Alimentación del procesador.'],
  [(n) => n === 'GND', 'Referencia eléctrica y retorno de la alimentación.'],
  [(n) => n === 'CLK', DESCRIPTIONS['clock']],
  [
    (n) => n === 'ALE',
    'Permite capturar la dirección en un latch antes de reutilizar las líneas multiplexadas como bus de datos.',
  ],
  [
    (n) => n === 'RESET',
    'Inicializa el procesador cuando se aplica la secuencia eléctrica requerida.',
  ],
  [
    (n) => n === 'NMI' || n === 'INTR',
    'Entrada de petición de interrupción; NMI y INTR tienen reglas distintas de habilitación.',
  ],
];

const FIXED: Record<string, string> = {
  'memory-board':
    'Placa didáctica de 128 KiB por dos bancos de 64 KiB, presentada para explicar el bus de 16 bits del 8086. No representa una placa comercial ni toda la memoria direccionable.',
  spd: 'EEPROM de detección de presencia serie (SPD): informa al sistema de las características y temporizaciones del módulo DDR4.',
  'dimm-socket':
    'Conector del DIMM: la llave impide invertir el módulo. Las pestañas retienen sus extremos.',
  scope:
    'Osciloscopio: captura didáctica de dirección, lectura y escritura. Los pasos no representan tiempos eléctricos medidos.',
  power:
    'Fuente regulada: VCC y GND alimentan el circuito. Una tensión incorrecta puede dañar hardware real; este visor no modela electricidad.',
  lamp: 'Lámpara articulada: arrastra el anillo de cobre o usa el panel de luz para apuntar a otra zona del banco. Cambia la iluminación; no modifica registros ni memoria.',
  probe:
    'La sonda lleva una señal al instrumento sin sustituir la referencia de masa.',
  cable:
    'El conductor central transporta la señal; la pantalla exterior ofrece retorno y reduce interferencia.',
  tool: 'Manipulación física: la herramienta puede caer sobre su bandeja. No modifica registros ni bytes.',
  passives:
    'Los condensadores de desacoplo suministran corriente cerca del integrado y reducen perturbaciones de alimentación.',
  supports:
    'Los separadores evitan que la cara inferior de la placa toque el banco.',
  'bank-even':
    'Banco par: ocho chips × 65 536 bits = 64 KiB. Conecta D0–D7; A0 selecciona el byte par.',
  'bank-odd':
    'Banco impar: ocho chips × 65 536 bits = 64 KiB. Conecta D8–D15; BHE# habilita el byte alto.',
  dimm: 'Kingston KVR26N19S8/8: 8 GB, DDR4-2666, 1Rx8, ocho encapsulados FBGA y 288 contactos. No es memoria compatible con el 8086.',
  'esd-mat':
    'Alfombrilla antiestática: disipa la electricidad estática. Su superficie conserva marcas de uso; no es un plano de fabricación.',
  multimeter:
    'Multímetro: pulsa para cambiar el modo mostrado. Indica la referencia de la fuente y no está conectado al circuito del 8086.',
};

/** Plain-language explanation of the selected piece; pure so it can be tested without a renderer. */
export function describePiece(
  id: string,
  cells: { address: number; value: number }[],
  catalog: PieceOption[],
): string {
  if (id.startsWith('pin-')) {
    const n = Number(id.slice(4)),
      name = PIN_NAMES[n - 1] ?? '';
    const role = PIN_ROLES.find(([test]) => test(name))?.[1] ??
      'Señal de coordinación de bus. Su función depende de la configuración de modo y del ciclo de transferencia.';
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
    const cell = cells[Number(id.slice(5))];
    return cell
      ? 'Dirección física ' +
          hex(cell.address, 5) +
          'h · byte ' +
          hex(cell.value, 2) +
          'h. Vista lógica del estado del 8086; la geometría no es una celda DRAM física.'
      : 'Ventana lógica de bytes del 8086.';
  }
  if (FIXED[id]) return FIXED[id];
  if (id.startsWith('dram-'))
    return 'Intel 2164A: DRAM de 65 536 × 1 bit en DIP de 16 pines. Ocho circuitos forman un banco de un byte.';
  if (id.startsWith('dimm-chip-'))
    return 'Componente FBGA 1G × 8 bits. Ocho componentes forman el rango de 64 bits del módulo.';
  return (
    catalog.find((p) => p.id === id)?.description ??
    DESCRIPTIONS[id] ??
    'Selecciona una pieza en la escena o utiliza los controles del inspector.'
  );
}

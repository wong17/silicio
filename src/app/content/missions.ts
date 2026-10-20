export const MISSIONS = [
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
  {
    title: '09 / Ida y vuelta',
    source: 'MOV AX, 5\nCALL doble\nMOV BX, AX\nHLT\ndoble:\nADD AX, AX\nRET',
    goal: 'CALL en 0103h apila la dirección de retorno 0106h y salta a doble, en 0109h. RET la recupera: IP vuelve a 0106h y SP a FFFEh. AX y BX terminan en 000Ah.',
    answer: 10,
  },
];

import { COURSE_PROGRAMS, type CourseExpectation } from './course-programs';

export type MissionLevel = 'Fundamentos' | 'Control de flujo' | 'Entrada y salida' | 'Pila, procedimientos y macros';

/** A mission as the selector and the checker see it; the first nine keep their reference answer in AX. */
export interface LabMission {
  /** 1–17, the number in the title. */
  number: number;
  title: string;
  source: string;
  goal: string;
  level: MissionLevel;
  /** Keys the example types, in order. */
  keys?: string;
  /** Switches of the 8255 trainer the example sets. */
  switches?: number;
  predict?: { question: string; answer: string };
  observe?: string;
  /** Missions 01–09: expected AX. */
  answer?: number;
  /** Missions 10–17: expected final state. */
  expect?: CourseExpectation;
}

/** Where each mission sits in the selector (§4.4). */
export const MISSION_LEVELS: readonly { level: MissionLevel; numbers: readonly number[] }[] = [
  { level: 'Fundamentos', numbers: [1, 2, 3, 6, 8] },
  { level: 'Control de flujo', numbers: [4, 5, 12, 14, 15] },
  { level: 'Entrada y salida', numbers: [10, 11, 13, 16, 18] },
  { level: 'Pila, procedimientos y macros', numbers: [7, 9, 17] },
];
const levelOf = (n: number): MissionLevel => MISSION_LEVELS.find((l) => l.numbers.includes(n))!.level;

const COURSE_TEXT: Record<number, { goal: string; question: string; answer: string; observe: string }> = {
  10: {
    goal: 'Escribe un mensaje con INT 21h servicio 09h: DX apunta a la cadena y el $ marca su final.',
    question: '¿Qué texto aparecerá en la Pantalla?',
    answer: 'Hola mundo',
    observe: 'OFFSET msg es la dirección de la cadena, no su contenido; el $ no se imprime.',
  },
  11: {
    goal: 'Lee dos dígitos con el servicio 01h, réstales el carácter «0» para obtener su valor y súmalos. Escribe 3 y 4 cuando el programa los pida.',
    question: 'Si escribes 3 y 4, ¿qué dígito aparece al final?',
    answer: '7',
    observe: 'AL guarda el código ASCII de la tecla; SUB AL,\'0\' lo convierte en número.',
  },
  12: {
    goal: 'Suma un arreglo de diez palabras con LOOP y [SI]. Al final AX debe valer 55.',
    question: '¿Cuánto vale AX al terminar?',
    answer: '55',
    observe: 'SI avanza de 2 en 2 porque cada palabra ocupa dos bytes; CX cuenta las vueltas.',
  },
  13: {
    goal: 'Multiplica 12 × 11 con MUL y escribe el producto en decimal dividiendo entre 10 y apilando los restos.',
    question: '¿Qué número escribe la Pantalla?',
    answer: '132',
    observe: 'MUL BL deja el producto en AX; cada DIV BX separa un dígito, y la pila lo devuelve en orden.',
  },
  14: {
    goal: 'Cuenta los dígitos de 12345 dividiendo entre 10 hasta que el cociente llegue a 0. CX debe quedar en 5.',
    question: '¿Cuánto vale CX al terminar?',
    answer: '5',
    observe: 'Cada DIV BX quita el último dígito; INC CX cuenta una vuelta por dígito.',
  },
  15: {
    goal: 'Invierte 1234: DIV separa el último dígito y MUL lo coloca en el número invertido. AX debe quedar en 4321.',
    question: '¿Qué valor tendrá AX?',
    answer: '4321',
    observe: 'MUL BX multiplica DI por 10 y deja DX:AX; el dígito nuevo se suma después.',
  },
  16: {
    goal: 'Promedia las notas 80, 90 y 70: suma con LOOP y divide entre 3 con DIV. AX debe quedar en 80.',
    question: '¿Cuánto vale AX al terminar?',
    answer: '80',
    observe: 'DIV BL deja el cociente en AL y el resto en AH; MOV AH,0 deja solo el cociente.',
  },
  18: {
    goal: 'Configura el 8255 (palabra de control 82h en el puerto A3h), lee los interruptores del puerto B (A1h) y cópialos a los LEDs del puerto A (A0h). Cambia los interruptores y ejecuta otra vez.',
    question: 'Con los interruptores 01011010, ¿qué LEDs quedan encendidos?',
    answer: '01011010',
    observe: 'IN lleva al registro lo que hay en las patillas del puerto; OUT lo deja en el latch que alimenta los LEDs. El 8255 debe configurarse antes de usarse.',
  },
  17: {
    goal: 'Una macro escribe un mensaje; se usa dos veces. En el listado verás cómo se expande en el mismo texto.',
    question: '¿Qué texto aparecerá en la Pantalla?',
    answer: 'Hola Adios',
    observe: 'El ensamblador sustituye cada llamada por el cuerpo de la macro: no hay CALL ni RET.',
  },
};

const BASE: LabMission[] = MISSIONS.map((m, i) => ({
  number: i + 1,
  title: m.title,
  source: m.source,
  goal: m.goal,
  level: levelOf(i + 1),
  answer: m.answer,
}));

const COURSE: LabMission[] = COURSE_PROGRAMS.map((p) => {
  const t = COURSE_TEXT[p.mission];
  return {
    number: p.mission,
    title: String(p.mission).padStart(2, '0') + ' / ' + p.title,
    source: p.source,
    goal: t.goal,
    level: levelOf(p.mission),
    keys: p.keys,
    switches: p.switches,
    predict: { question: t.question, answer: t.answer },
    observe: t.observe,
    expect: p.expect,
  };
});

/** Missions 01–18 in the order of their number. */
export const LAB_MISSIONS: readonly LabMission[] = [...BASE, ...COURSE];

/** True when the final state satisfies what the mission asks for (screen text, registers or a variable). */
export function meetsExpectation(
  e: CourseExpectation,
  state: { registers: Record<string, number>; memory: Record<number, number>; io: { screen: string; ports?: Readonly<Record<number, number>> } },
  data: readonly { name: string; address: number; type: 'byte' | 'word' }[],
): boolean {
  if (e.screen !== undefined && state.io.screen !== e.screen) return false;
  if (e.screenEndsWith !== undefined && !state.io.screen.endsWith(e.screenEndsWith)) return false;
  for (const [name, value] of Object.entries(e.registers ?? {})) if (state.registers[name] !== value) return false;
  for (const [port, value] of Object.entries(e.ports ?? {})) if (state.io.ports?.[Number(port)] !== value) return false;
  if (e.variable) {
    const symbol = data.find((d) => d.name.toLowerCase() === e.variable!.name.toLowerCase());
    if (!symbol) return false;
    const at = ((state.registers['DS'] * 16 + symbol.address) & 0xfffff) >>> 0;
    const low = state.memory[at] ?? 0;
    const value = symbol.type === 'word' ? low | ((state.memory[(at + 1) & 0xfffff] ?? 0) << 8) : low;
    if (value !== e.variable.value) return false;
  }
  return true;
}

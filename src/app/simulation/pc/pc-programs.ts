import { assemble } from './pc-isa';
import { utf8Encode, wordsToBytes, type SsdFiles } from './pc-files';
import { FRAMEBUFFER_BASE, INPUT_BASE, PROGRAM_BASE, WORK_BASE, offState, type PcState } from './pc-model';

/** Names the programs use for the parts of the memory map. */
const SYMBOLS = {
  fb: FRAMEBUFFER_BASE,
  input: INPUT_BASE,
  work: WORK_BASE,
  queue: WORK_BASE + 2,
  imgend: INPUT_BASE + 64,
};

export interface PcProgram {
  id: 'hola-sondeo' | 'hola-interrupcion' | 'suma-archivo' | 'editar-guardar' | 'imagen-inversa';
  title: string;
  /** Which question of the course it answers. */
  teaches: string;
  /** Keys the example types. */
  keys?: string;
  /** Files of the SSD besides the program, as the exercise starts. */
  files: Readonly<Record<string, readonly number[]>>;
  source: string;
}

const ECHO_TAIL = `    DISPLAY text
    COMPAREI R1, 10
    BRANCH NZ, `;

export const PC_PROGRAMS: readonly PcProgram[] = [
  {
    id: 'hola-sondeo',
    title: 'Escribir y ver · sondeo',
    teaches: 'El procesador consulta el teclado una y otra vez (sondeo); mientras tanto no hace trabajo útil.',
    keys: 'Hola\n',
    files: {},
    source: `BRANCH ALWAYS, main
HALT
main:
    LOADI R2, fb          ; R2 apunta a la RAM de pantalla
espera:
    STATUS R0, 0          ; ¿hay una tecla en el controlador?
    COMPAREI R0, 0
    BRANCH Z, espera      ; no: vuelve a preguntar
    INPUT R1              ; sí: la lee
    STORE [R2], R1        ; la guarda en la RAM de pantalla
    ADDI R2, 1
${ECHO_TAIL}espera
    HALT`,
  },
  {
    id: 'hola-interrupcion',
    title: 'Escribir y ver · interrupción',
    teaches: 'El teclado interrumpe al procesador, que sigue con su trabajo de fondo entre tecla y tecla.',
    keys: 'Hola\n',
    files: {},
    source: `BRANCH ALWAYS, main
BRANCH ALWAYS, handler   ; vector de la interrupción del teclado
main:
    LOADI R0, work        ; R0: área de trabajo
    LOADI R2, fb
    LOADI R3, 0           ; teclas ya mostradas
    EI                    ; habilita las interrupciones
trabajo:
    LOAD R1, [R0]         ; trabajo de fondo: un contador que avanza
    ADDI R1, 1
    STORE [R0], R1
    LOAD R1, [R0+1]       ; teclas recibidas por la rutina
    COMPARE R1, R3
    BRANCH Z, trabajo     ; ninguna nueva: sigue trabajando
    LOAD R1, [R3+queue]
    ADDI R3, 1
    STORE [R2], R1
    ADDI R2, 1
${ECHO_TAIL}trabajo
    HALT
handler:
    STORE [R0+14], R1     ; guarda lo que la rutina va a usar
    STORE [R0+13], R3
    LOAD R3, [R0+1]
    INPUT R1              ; lee la tecla del controlador
    STORE [R3+queue], R1  ; la pone en la cola
    ADDI R3, 1
    STORE [R0+1], R3
    LOAD R3, [R0+13]
    LOAD R1, [R0+14]
    RETI                  ; restaura PC y flags`,
  },
  {
    id: 'suma-archivo',
    title: 'Sumar un archivo',
    teaches: 'Los datos viajan del SSD a la RAM, la CPU los procesa y el resultado vuelve al SSD y a la pantalla.',
    files: { 'datos.csv': utf8Encode('1,2,3,4') },
    source: `BRANCH ALWAYS, main
HALT
main:
    READ_FILE R2, input, datos.csv   ; SSD → RAM; R2 = cuántos valores
    LOADI R0, input
    LOADI R1, 0
suma:
    COMPAREI R2, 0
    BRANCH Z, fin
    LOAD R3, [R0]
    ADD R1, R3
    BRANCH V, desborda    ; la suma no cabe: no se publica una cifra engañosa
    ADDI R0, 1
    ADDI R2, -1
    BRANCH ALWAYS, suma
fin:
    WRITE_FILE R1, resultado.txt, number
    DISPLAY number, R1
    HALT
desborda:
    DISPLAY error, R0, 1
    HALT`,
  },
  {
    id: 'editar-guardar',
    title: 'Editar y guardar',
    teaches: 'La RAM se borra al apagar; el archivo guardado en el SSD sobrevive.',
    files: { 'nota.txt': utf8Encode('Hola') },
    source: `BRANCH ALWAYS, main
HALT
main:
    READ_FILE R2, input, nota.txt
    LOADI R0, input
    LOADI R1, 0
    ADD R1, R2            ; R1 conserva la longitud
mayus:
    COMPAREI R2, 0
    BRANCH Z, guardar
    LOAD R3, [R0]
    COMPAREI R3, 97       ; 'a'
    BRANCH LT, sigue
    COMPAREI R3, 123      ; después de 'z'
    BRANCH GE, sigue
    ADDI R3, -32          ; minúscula → mayúscula
    STORE [R0], R3
sigue:
    ADDI R0, 1
    ADDI R2, -1
    BRANCH ALWAYS, mayus
guardar:
    WRITE_FILE R1, nota.txt, text   ; RAM → SSD
    DISPLAY input-text, R1
    HALT`,
  },
  {
    id: 'imagen-inversa',
    title: 'Procesar una imagen',
    teaches: 'Una imagen de 8×8 se invierte con 255 − valor: la CPU trabaja en RAM y la pantalla lo muestra.',
    files: { 'imagen.csv': utf8Encode(Array.from({ length: 64 }, (_, i) => Math.round((i * 255) / 63)).join(',')) },
    source: `BRANCH ALWAYS, main
HALT
main:
    READ_FILE R3, input, imagen.csv
    LOADI R0, input
    LOADI R2, fb
invierte:
    LOAD R1, [R0]
    LOADI R3, 255
    SUB R3, R1            ; 255 − valor
    STORE [R2], R3
    ADDI R0, 1
    ADDI R2, 1
    COMPAREI R0, imgend
    BRANCH LT, invierte
    DISPLAY image
    HALT`,
  },
];

export const programById = (id: PcProgram['id']): PcProgram => PC_PROGRAMS.find((p) => p.id === id)!;

/** The words of a program, ready to be written to `programa.bin`. */
export const programWords = (program: PcProgram): number[] => assemble(program.source, PROGRAM_BASE, SYMBOLS);

/** A switched-off PC whose SSD holds the program and the example files of the exercise. */
export function freshPc(id: PcProgram['id']): PcState {
  const program = programById(id);
  const ssd: SsdFiles = { 'programa.bin': wordsToBytes(programWords(program)), ...program.files };
  return offState(ssd);
}

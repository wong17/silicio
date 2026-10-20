/**
 * Exercises of the course (Arquitectura de Máquinas I, Actividad 4 and Práctica 1), written the way a
 * student types them in EMU8086. They are the fixtures of missions 10–17 and of the assembler tests.
 */
export interface CourseExpectation {
  /** Whole text of the emulated screen when the program ends. */
  screen?: string;
  /** Last characters of the screen, for programs that echo what was typed. */
  screenEndsWith?: string;
  registers?: Readonly<Record<string, number>>;
  /** Value of a DB/DW variable, read with its declared type. */
  variable?: { name: string; value: number };
}

export interface CourseProgram {
  mission: number;
  title: string;
  source: string;
  /** Keys typed at the keyboard, in order. */
  keys?: string;
  expect: CourseExpectation;
}

export const COURSE_PROGRAMS: readonly CourseProgram[] = [
  {
    mission: 10,
    title: 'Hola mundo',
    source: `ORG 100h
MOV DX, OFFSET msg
MOV AH, 09h
INT 21h
MOV AH, 4Ch
INT 21h
msg DB 'Hola mundo$'`,
    expect: { screen: 'Hola mundo' },
  },
  {
    mission: 11,
    title: 'Suma de dos dígitos leídos',
    source: `ORG 100h
MOV AH, 01h
INT 21h        ; AL = primer dígito en ASCII
SUB AL, '0'
MOV BL, AL
MOV AH, 01h
INT 21h
SUB AL, '0'
ADD BL, AL
MOV DL, '='
MOV AH, 02h
INT 21h
MOV DL, BL
ADD DL, '0'
INT 21h
MOV AH, 4Ch
INT 21h`,
    keys: '34',
    expect: { screen: '34=7', screenEndsWith: '7' },
  },
  {
    mission: 12,
    title: 'Suma de un arreglo',
    source: `ORG 100h
JMP inicio
datos DW 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
inicio:
MOV AX, 0
MOV CX, 10
MOV SI, OFFSET datos
otra:
ADD AX, [SI]
ADD SI, 2
LOOP otra
HLT`,
    expect: { registers: { AX: 55 } },
  },
  {
    mission: 13,
    title: 'Multiplicación',
    source: `ORG 100h
JMP inicio
producto DW ?
inicio:
MOV AL, 12
MOV BL, 11
MUL BL          ; AX = AL * BL
MOV producto, AX
CALL imprimir
MOV AH, 4Ch
INT 21h

imprimir PROC
  MOV BX, 10
  MOV CX, 0
dividir:
  MOV DX, 0
  DIV BX
  PUSH DX
  INC CX
  CMP AX, 0
  JNE dividir
mostrar:
  POP DX
  ADD DL, '0'
  MOV AH, 02h
  INT 21h
  LOOP mostrar
  RET
imprimir ENDP`,
    expect: { screen: '132', variable: { name: 'producto', value: 132 } },
  },
  {
    mission: 14,
    title: 'Contar dígitos',
    source: `ORG 100h
MOV AX, 12345
MOV BX, 10
MOV CX, 0
contar:
MOV DX, 0
DIV BX
INC CX
CMP AX, 0
JNE contar
HLT`,
    expect: { registers: { CX: 5 } },
  },
  {
    mission: 15,
    title: 'Invertir un número',
    source: `ORG 100h
MOV AX, 1234
MOV BX, 10
MOV DI, 0       ; número invertido
otra:
MOV DX, 0
DIV BX          ; AX = cociente, DX = último dígito
MOV SI, AX
MOV CX, DX
MOV AX, DI
MUL BX          ; DX:AX = DI * 10
ADD AX, CX
MOV DI, AX
MOV AX, SI
CMP AX, 0
JNE otra
MOV AX, DI
HLT`,
    expect: { registers: { AX: 4321 } },
  },
  {
    mission: 16,
    title: 'Promedio de notas',
    source: `ORG 100h
JMP inicio
notas DB 80, 90, 70
inicio:
MOV AX, 0
MOV SI, OFFSET notas
MOV CX, 3
sumar:
MOV BL, [SI]
MOV BH, 0
ADD AX, BX
INC SI
LOOP sumar
MOV BL, 3
DIV BL          ; AL = cociente, AH = resto
MOV AH, 0
HLT`,
    expect: { registers: { AX: 80 } },
  },
  {
    mission: 17,
    title: 'Una macro',
    source: `ORG 100h
imprimir MACRO texto
  MOV DX, OFFSET texto
  MOV AH, 09h
  INT 21h
ENDM
JMP inicio
saludo DB 'Hola$'
despedida DB ' Adios$'
inicio:
imprimir saludo
imprimir despedida
MOV AH, 4Ch
INT 21h`,
    expect: { screen: 'Hola Adios' },
  },
];

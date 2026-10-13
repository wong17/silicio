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
];

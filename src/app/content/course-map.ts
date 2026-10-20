import type { Section } from '../world/scene-inputs';

export type TopicStatus = 'Disponible' | 'Ampliándose' | 'Próximamente';

/** A topic of the course (Arquitectura de Máquinas I y II) and the place of the laboratory that works it. */
export interface CourseTopic {
  topic: string;
  /** Activity or document of the course where the topic is asked. */
  source: string;
  /** What the student does in SILICIO, said plainly. */
  where: string;
  station: Section;
  piece?: string;
  status: TopicStatus;
}

/**
 * Map of the course onto the laboratory (plan §1.2). The status says what exists today, so Ayuda never
 * promises an activity that is still being built.
 */
export const COURSE_MAP: readonly CourseTopic[] = [
  {
    topic: 'Arquitectura y organización; procesamiento, memoria, E/S e interconexión',
    source: 'Actividad 1 · Trabajo 1 (AMC II)',
    where: 'La máquina: cada transferencia lleva dirección, dato y control, y una de las cuatro funciones del computador.',
    station: 'machine',
    piece: 'cpu',
    status: 'Disponible',
  },
  {
    topic: 'Estructura del CPU: registros, unidad de control, ALU y buses',
    source: 'Trabajo 3 (AMC II)',
    where: 'Banco 8086: Estado muestra los registros; las piezas ALU, Control y BIU se seleccionan en la escena.',
    station: '8086',
    piece: 'alu',
    status: 'Disponible',
  },
  {
    topic: 'Ciclo de instrucción: búsqueda, ejecución y verificación de interrupciones',
    source: 'Trabajo 3 (AMC II) · Guía básica de la CPU',
    where: 'Banco 8086: el transporte recorre las fases de cada instrucción (Buscar, Decodificar, Ejecutar, Escribir).',
    station: '8086',
    piece: 'control',
    status: 'Ampliándose',
  },
  {
    topic: 'Terminales del 8086 (organización externa)',
    source: 'Actividad 2',
    where: 'Banco 8086: los 40 pines se inspeccionan uno a uno; ALE es el pin 25.',
    station: '8086',
    piece: 'pin-25',
    status: 'Disponible',
  },
  {
    topic: 'Registros ix86, segmentación y dirección física',
    source: 'Actividad 3',
    where: 'Memoria: segmento × 16 + desplazamiento y los bytes que llegan a cada banco.',
    station: 'memory',
    piece: 'bank-even',
    status: 'Disponible',
  },
  {
    topic: 'Modos de direccionamiento y estructuras de control',
    source: 'Actividad 4',
    where: 'Banco 8086: misiones 04 (LOOP con [SI]) y 05 (CMP y JZ).',
    station: '8086',
    status: 'Ampliándose',
  },
  {
    topic: 'Ejercicios de EMU8086: mensaje, suma de números leídos, arreglos, multiplicación, promedio',
    source: 'Actividad 4 · Práctica 1',
    where: 'Banco 8086: misiones 10 a 17 con la ventana Pantalla.',
    station: '8086',
    status: 'Disponible',
  },
  {
    topic: 'Procedimientos, pila, macros e interrupciones de software',
    source: 'Actividad 5',
    where: 'Banco 8086: misión 09 (CALL y RET), misión 17 (macros) e INT 21h en las misiones 10 a 13.',
    station: '8086',
    status: 'Disponible',
  },
  {
    topic: 'Memoria caché',
    source: 'Guía básica de la CPU',
    where: 'Memoria: caché de cuatro y ocho líneas con predicción de acierto o fallo.',
    station: 'memory',
    status: 'Disponible',
  },
  {
    topic: 'Conexión con periféricos: 8255 y 8259',
    source: 'Actividades 2 y 3',
    where: 'Puertos del 8255 en el banco 8086 (misión 18) e interrupción del teclado en el PC moderno.',
    station: '8086',
    status: 'Ampliándose',
  },
  {
    topic: 'Von Neumann frente a Harvard',
    source: 'Actividad 2 · Trabajo 3 (AMC II)',
    where: 'PC moderno: programa y datos comparten la misma RAM, en regiones distintas.',
    station: 'machine',
    status: 'Disponible',
  },
  {
    topic: 'CISC frente a RISC; SoC y memoria unificada',
    source: 'Guía básica de la CPU · Investigación Apple M5',
    where: 'SoC: la misma tarea en CISC y en RISC, y un buffer compartido entre CPU y GPU con una imagen de 8×8.',
    station: 'apple',
    piece: 'performance',
    status: 'Disponible',
  },
];

/** EMU8086 windows and their place in SILICIO (plan §4.1). */
export const EMU8086_EQUIVALENCES: readonly { emu: string; silicio: string; status: TopicStatus }[] = [
  { emu: 'Editor y «compile»', silicio: 'Programa: editor numerado y «Ensamblar y reiniciar»', status: 'Disponible' },
  { emu: 'Línea amarilla del código fuente', silicio: 'Programa: línea actual en el editor y en el listado, con puntos de interrupción', status: 'Disponible' },
  { emu: 'Registros', silicio: 'Estado: registros, punteros, segmentos, IP y flags', status: 'Disponible' },
  { emu: 'Single step / Run / Step back', silicio: 'Transporte: Paso, Ejecutar y Retroceder', status: 'Disponible' },
  { emu: 'Memory', silicio: 'Capítulo Memoria con los bytes del mismo programa', status: 'Ampliándose' },
  { emu: 'Variables', silicio: 'Variables dentro de Programa: nombre, dirección, tipo y valor', status: 'Disponible' },
  { emu: 'Stack', silicio: 'Pila contextual al usar PUSH, POP, CALL y RET', status: 'Próximamente' },
  { emu: 'Emulator screen', silicio: 'Pantalla de 80×25 con teclado (INT 21h)', status: 'Disponible' },
  { emu: 'Virtual devices', silicio: 'Puertos 8255: LEDs, interruptores y siete segmentos (panel 2D; piezas 3D en el banco: pendiente)', status: 'Ampliándose' },
];

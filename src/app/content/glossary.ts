export interface GlossaryTerm {
  /** Text as written in the interface, e.g. ALE. */
  term: string;
  /** Spanish expansion or name. */
  name: string;
  definition: string;
}

/** Abbreviations and technical words that appear in the console, defined once. */
export const GLOSSARY: readonly GlossaryTerm[] = [
  { term: 'ALE', name: 'Address Latch Enable', definition: 'Señal que avisa de que el bus lleva una dirección y que debe retenerse, porque en las mismas líneas viajarán después los datos.' },
  { term: 'RD', name: 'Lectura', definition: 'Señal de control, activa en bajo, que indica que el procesador lee de la memoria o de un puerto.' },
  { term: 'WR', name: 'Escritura', definition: 'Señal de control, activa en bajo, que indica que el procesador escribe en la memoria o en un puerto.' },
  { term: 'BIU', name: 'Unidad de interfaz de bus', definition: 'Mitad del 8086 que calcula direcciones físicas, busca instrucciones y habla con memoria y entrada/salida.' },
  { term: 'EU', name: 'Unidad de ejecución', definition: 'Mitad del 8086 que decodifica y ejecuta las instrucciones con la ALU y los registros.' },
  { term: 'BHE', name: 'Bus High Enable', definition: 'Señal que habilita el byte alto del bus de datos (D8 a D15); junto con A0 distingue byte par, byte impar o palabra.' },
  { term: 'segmento', name: 'Segmento', definition: 'Bloque de hasta 64 KiB cuyo origen guarda un registro de segmento; la dirección física se forma con él.' },
  { term: 'offset', name: 'Desplazamiento', definition: 'Posición dentro de un segmento. Se suma al segmento multiplicado por 16 para dar la dirección física.' },
  { term: 'dirección física', name: 'Dirección física', definition: 'Dirección de 20 bits que llega a la memoria: segmento × 16 + offset.' },
  { term: 'little endian', name: 'Little endian', definition: 'Forma de guardar una palabra: el byte menos significativo va primero, en la dirección más baja.' },
  { term: 'DIR', name: 'Direcciones', definition: 'Bus que selecciona qué ubicación de memoria o puerto será leída o escrita.' },
  { term: 'DATO', name: 'Datos', definition: 'Bus que transporta el valor de la transferencia.' },
  { term: 'CTRL', name: 'Control', definition: 'Conjunto de señales que indican la operación y coordinan su realización.' },
  { term: 'B0', name: 'Buffer 0', definition: 'Primer buffer de la memoria unificada del ejemplo: contiene la entrada que prepara la CPU.' },
  { term: 'B1', name: 'Buffer 1', definition: 'Segundo buffer del ejemplo: recibe el resultado que escribe la GPU y que la CPU lee al terminar.' },
  { term: 'SoC', name: 'System on Chip', definition: 'Sistema en un chip: CPU, GPU, motor neuronal y memoria unificada integrados en el mismo encapsulado.' },
  { term: 'DRAM', name: 'Memoria dinámica de acceso aleatorio', definition: 'Memoria que guarda cada bit como carga en un condensador y necesita refresco periódico.' },
  { term: 'RAS', name: 'Row Address Strobe', definition: 'Señal que selecciona la fila de la matriz de celdas de una DRAM.' },
  { term: 'CAS', name: 'Column Address Strobe', definition: 'Señal que selecciona la columna de la matriz una vez fijada la fila.' },
  { term: 'SPD', name: 'Serial Presence Detect', definition: 'Pequeña memoria del módulo DIMM que describe al sistema su capacidad y sus tiempos.' },
];

const BY_KEY = new Map(GLOSSARY.map((t) => [t.term.toLowerCase(), t]));

export function findTerm(term: string): GlossaryTerm | undefined {
  return BY_KEY.get(term.trim().toLowerCase());
}

/** Search by term or name, ignoring case and accents. */
export function searchGlossary(query: string): GlossaryTerm[] {
  const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const q = fold(query.trim());
  if (!q) return [...GLOSSARY];
  return GLOSSARY.filter((t) => fold(t.term).includes(q) || fold(t.name).includes(q) || fold(t.definition).includes(q));
}

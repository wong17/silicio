import { FILE_NAMES } from './pc-isa';

/** Limits of what the student can bring in (§6.2). */
export const MAX_TEXT_CHARS = 256;
export const MAX_FILE_BYTES = 64 * 1024;
export const MAX_CSV_VALUES = 1024;

/** The virtual SSD: file name a bytes. It survives powering the PC off. */
export type SsdFiles = Readonly<Record<string, readonly number[]>>;

export function utf8Encode(text: string): number[] {
  return [...new TextEncoder().encode(text)];
}

export function utf8Decode(bytes: readonly number[]): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bytes));
  } catch {
    throw Error('El archivo no es texto UTF-8 válido: no se importa.');
  }
}

/** Integers of a CSV: decimal, signed 32 bits, separated by commas or line breaks; spaces are allowed. */
export function parseCsv(text: string): number[] {
  const fields = text.split(/\r?\n|,/).map((f) => f.trim());
  if (fields.length && fields[fields.length - 1] === '') fields.pop();
  if (!fields.length) throw Error('El CSV no tiene valores.');
  if (fields.some((f) => f === '')) throw Error('El CSV tiene un campo vacío.');
  if (fields.length > MAX_CSV_VALUES) throw Error('El CSV tiene más de ' + MAX_CSV_VALUES + ' valores.');
  const cleaned = fields;
  return cleaned.map((f, i) => {
    if (!/^[-+]?\d+$/.test(f)) throw Error('Valor inválido «' + f + '» en la posición ' + (i + 1) + ': se esperan enteros decimales.');
    const n = Number(f);
    if (n < -2147483648 || n > 2147483647) throw Error('El valor ' + f + ' no cabe en 32 bits con signo.');
    return n;
  });
}

export const decimalText = (n: number): string => String(n | 0);

const extension = (name: string) => name.slice(name.lastIndexOf('.') + 1).toLowerCase();

/** What a file holds, decided by its name. */
export type FileKind = 'text' | 'csv' | 'program';
export const kindOf = (name: string): FileKind => (extension(name) === 'csv' ? 'csv' : extension(name) === 'bin' ? 'program' : 'text');

/** Checks a file brought by the student before it reaches the SSD; throws an explanation and changes nothing. */
export function validateImport(name: string, bytes: readonly number[]): void {
  if (!(FILE_NAMES as readonly string[]).includes(name) || name === 'programa.bin')
    throw Error('Ese archivo no se puede importar: elige datos.csv, nota.txt, imagen.csv o resultado.txt.');
  if (bytes.length > MAX_FILE_BYTES) throw Error('El archivo supera 64 KiB (' + bytes.length + ' bytes).');
  const text = utf8Decode(bytes);
  if (kindOf(name) === 'csv') {
    const values = parseCsv(text);
    if (name === 'imagen.csv' && (values.length !== 64 || values.some((v) => v < 0 || v > 255)))
      throw Error('El mosaico necesita exactamente 64 valores de 0 a 255 (8 × 8).');
  }
}

/** Copies a file into the SSD (an explicit action, apart from reading it into RAM). */
export function importFile(files: SsdFiles, name: string, bytes: readonly number[]): SsdFiles {
  validateImport(name, bytes);
  return { ...files, [name]: [...bytes] };
}

/** Typed text goes to a file as UTF-8, at most 256 characters per send. */
export function importText(files: SsdFiles, name: string, text: string): SsdFiles {
  if ([...text].length > MAX_TEXT_CHARS) throw Error('El texto supera ' + MAX_TEXT_CHARS + ' caracteres por envío.');
  return importFile(files, name, utf8Encode(text));
}

/** The words `READ_FILE` puts in RAM: code points for text, integers for CSV, instruction words for a program. */
export function fileWords(files: SsdFiles, name: string): number[] {
  const bytes = files[name];
  if (!bytes) throw Error('El archivo ' + name + ' no existe en el SSD.');
  const kind = kindOf(name);
  if (kind === 'program') {
    if (bytes.length % 4) throw Error(name + ' no es un programa: su tamaño no es múltiplo de 4 bytes.');
    const words: number[] = [];
    for (let i = 0; i < bytes.length; i += 4) words.push((bytes[i] | (bytes[i + 1] << 8) | (bytes[i + 2] << 16) | (bytes[i + 3] << 24)) >>> 0);
    return words;
  }
  const text = utf8Decode(bytes);
  return kind === 'csv' ? parseCsv(text) : [...text].map((c) => c.codePointAt(0)!);
}

export function wordsToBytes(words: readonly number[]): number[] {
  return words.flatMap((w) => [w & 255, (w >>> 8) & 255, (w >>> 16) & 255, (w >>> 24) & 255]);
}

export const asText = (files: SsdFiles, name: string): string | undefined => (files[name] ? utf8Decode(files[name]) : undefined);

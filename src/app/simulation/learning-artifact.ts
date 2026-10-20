import type { ControllerId } from '../laboratory/controllers/simulation-controller';

/**
 * What one engine hands to another for a comparison: values the student typed or a result in a shared
 * format, never a snapshot (registers and addresses of one architecture mean nothing in another).
 */
export type ArtifactKind = 'tile-image' | 'word-task';

export interface TileImage {
  width: 8;
  height: 8;
  /** Gray levels 0–255, row by row. */
  pixels: readonly number[];
  /** Inverted image, when the origin already computed it. */
  result?: readonly number[];
}
/** A word in memory and the accumulator it is added to: the task of mission 01. */
export interface WordTask {
  accumulator: number;
  word: number;
}
export interface Payloads {
  'tile-image': TileImage;
  'word-task': WordTask;
}
export interface LearningArtifact<K extends ArtifactKind = ArtifactKind> {
  id: string;
  schemaVersion: 1;
  kind: K;
  origin: ControllerId;
  payload: Payloads[K];
}

/** Which engines may receive each kind of artifact. */
const ACCEPTED: Readonly<Record<ArtifactKind, readonly ControllerId[]>> = {
  'tile-image': ['machine', 'soc'],
  'word-task': ['8086', 'soc'],
};
const ORIGINS: readonly ControllerId[] = ['8086', 'memory-lesson', 'machine', 'soc'];

const isByteArray = (v: unknown, length: number): v is number[] =>
  Array.isArray(v) && v.length === length && v.every((n) => Number.isInteger(n) && n >= 0 && n <= 255);
const isWord = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 0xffff;

let serial = 0;

export function createArtifact<K extends ArtifactKind>(
  kind: K,
  origin: ControllerId,
  payload: Payloads[K],
): LearningArtifact<K> {
  return validate({ id: 'artefacto-' + ++serial, schemaVersion: 1, kind, origin, payload }) as LearningArtifact<K>;
}

/** Checks an artifact that came from storage or another engine; throws before anything is used. */
export function validate(value: unknown): LearningArtifact {
  const a = value as LearningArtifact;
  if (!a || typeof a !== 'object') throw Error('Artefacto inválido.');
  if (a.schemaVersion !== 1) throw Error('Versión de artefacto no admitida.');
  if (typeof a.id !== 'string' || !a.id || a.id.length > 100) throw Error('Artefacto sin identificador.');
  if (!ORIGINS.includes(a.origin)) throw Error('Procedencia de artefacto desconocida.');
  const p = a.payload as unknown as Record<string, unknown>;
  if (!p || typeof p !== 'object') throw Error('Artefacto sin datos.');
  const foreign = (allowed: string[]) => {
    const key = Object.keys(p).find((k) => !allowed.includes(k));
    if (key) throw Error('Un artefacto no puede llevar estado de otra arquitectura (' + key + ').');
  };
  if (a.kind === 'tile-image') {
    foreign(['width', 'height', 'pixels', 'result']);
    if (p['width'] !== 8 || p['height'] !== 8 || !isByteArray(p['pixels'], 64))
      throw Error('Mosaico inválido: 8×8 valores de 0 a 255.');
    if (p['result'] !== undefined && !isByteArray(p['result'], 64)) throw Error('Resultado del mosaico inválido.');
  } else if (a.kind === 'word-task') {
    foreign(['accumulator', 'word']);
    if (!isWord(p['accumulator']) || !isWord(p['word'])) throw Error('Tarea de suma inválida: palabras de 16 bits.');
  } else throw Error('Tipo de artefacto desconocido.');
  return a;
}

/** The payload for `target`, or an explanation of why that engine cannot take it. */
export function transfer<K extends ArtifactKind>(artifact: LearningArtifact<K>, target: ControllerId): Payloads[K] {
  validate(artifact);
  if (!ACCEPTED[artifact.kind].includes(target))
    throw Error('Este artefacto (' + artifact.kind + ') no se puede llevar a ' + target + '.');
  return structuredClone(artifact.payload);
}

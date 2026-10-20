import { readSession, type Session } from './session-codec';
import { validate, type LearningArtifact } from './learning-artifact';
import { readPcState } from './pc/pc-state-codec';
import { validTile, type MemoryMode } from './buffer-experiment';
import { PC_PROGRAMS } from './pc/pc-programs';
import type { PcState } from './pc/pc-model';

export const LAB_LIMIT_BYTES = 12_000_000;
const ACTIVITIES = ['store', 'addresses', 'cache', 'ram'] as const;
const CONTROLLERS = ['8086', 'memory-lesson', 'machine', 'soc'] as const;
const VIEWS = ['8086', 'memory', 'machine', 'soc'] as const;
const FORMATS = ['hex', 'dec', 'bin', 'ascii'] as const;

export interface MemoryPart {
  activity: (typeof ACTIVITIES)[number];
  format: (typeof FORMATS)[number];
  /** Bytes of the isolated exercise, address → value. */
  exercise: Record<number, number>;
  progress: Record<(typeof ACTIVITIES)[number], number>;
  inputs: { mode: string; regBX: string; regBP: string; regSI: string; regDI: string; displacement: string; segDS: string; segSS: string; value: string };
}
export interface PcPart {
  programId: (typeof PC_PROGRAMS)[number]['id'];
  state: PcState;
}
export interface SocPart {
  mode: MemoryMode;
  tile: number[];
  stage: 0 | 1 | 2;
}
export interface LessonPart {
  lessonId?: string;
  controllerId?: (typeof CONTROLLERS)[number];
  view?: (typeof VIEWS)[number];
  artifacts: LearningArtifact[];
  artifactId?: string;
}
export interface GuidePart {
  pathId: string;
  index: number;
}

/** What a v3 file carries: every exercise of the laboratory, each one validated before any of it is applied. */
export interface LabV3 {
  /** The 8086 session in the v1/v2 codec, with its branches and its saved comparison state. */
  cpu: Session;
  memory: MemoryPart;
  pc: PcPart;
  soc: SocPart;
  lesson: LessonPart;
  guide?: GuidePart;
}
export type LoadedLab = { kind: 'legacy'; cpu: Session } | { kind: 'v3'; lab: LabV3 };

const fail = (m: string): never => {
  throw Error(m);
};
const hex4 = (v: unknown) => typeof v === 'string' && /^[0-9a-f]{0,4}$/i.test(v);

function readMemory(raw: unknown): MemoryPart {
  const m = raw as MemoryPart;
  if (!m || typeof m !== 'object') return fail('Falta la parte de Memoria.');
  if (!ACTIVITIES.includes(m.activity) || !FORMATS.includes(m.format)) fail('Memoria: actividad o formato inválidos.');
  const exercise: Record<number, number> = {};
  const entries = Object.entries(m.exercise ?? {});
  if (!m.exercise || typeof m.exercise !== 'object' || Array.isArray(m.exercise) || entries.length > 65536) fail('Memoria: bytes del ejercicio inválidos.');
  for (const [k, v] of entries) {
    const a = Number(k);
    if (!/^\d+$/.test(k) || a > 0xfffff || !Number.isInteger(v) || (v as number) < 0 || (v as number) > 255) fail('Memoria: byte o dirección inválidos.');
    exercise[a] = v as number;
  }
  const progress = {} as MemoryPart['progress'];
  for (const a of ACTIVITIES) {
    const p = m.progress?.[a];
    if (!Number.isInteger(p) || p < 0 || p > 8) fail('Memoria: progreso inválido.');
    progress[a] = p;
  }
  const i = m.inputs;
  if (!i || typeof i.mode !== 'string' || i.mode.length > 8 || !([i.regBX, i.regBP, i.regSI, i.regDI, i.displacement, i.segDS, i.segSS, i.value] as unknown[]).every(hex4)) fail('Memoria: campos inválidos.');
  return { activity: m.activity, format: m.format, exercise, progress, inputs: { ...i } };
}

function readPc(raw: unknown): PcPart {
  const p = raw as PcPart;
  if (!p || typeof p !== 'object' || !PC_PROGRAMS.some((x) => x.id === p.programId)) return fail('PC: ejercicio desconocido.');
  return { programId: p.programId, state: readPcState(p.state) };
}

function readSoc(raw: unknown): SocPart {
  const s = raw as SocPart;
  if (!s || (s.mode !== 'shared' && s.mode !== 'separate') || ![0, 1, 2].includes(s.stage) || !Array.isArray(s.tile) || !validTile(s.tile)) return fail('SoC: mosaico, modo o etapa inválidos.');
  return { mode: s.mode, tile: [...s.tile], stage: s.stage };
}

function readLesson(raw: unknown): LessonPart {
  const l = raw as LessonPart;
  if (!l || typeof l !== 'object' || !Array.isArray(l.artifacts) || l.artifacts.length > 8) return fail('Lección inválida.');
  if (l.lessonId !== undefined && (typeof l.lessonId !== 'string' || l.lessonId.length > 60)) fail('Lección: identificador inválido.');
  if (l.controllerId !== undefined && !CONTROLLERS.includes(l.controllerId)) fail('Lección: propietario desconocido.');
  if (l.view !== undefined && !VIEWS.includes(l.view)) fail('Lección: vista desconocida.');
  const artifacts = l.artifacts.map((a) => validate(a));
  if (l.artifactId !== undefined && !artifacts.some((a) => a.id === l.artifactId)) fail('Lección: el artefacto citado no está en el archivo.');
  return { lessonId: l.lessonId, controllerId: l.controllerId, view: l.view, artifacts, artifactId: l.artifactId };
}

/**
 * Reads a file or autosave. v1 and v2 hold the 8086 only; v3 holds every exercise and is refused whole if any
 * part is missing or damaged, so importing never leaves the laboratory half replaced.
 */
export function readLabSession(text: string): LoadedLab {
  if (text.length > LAB_LIMIT_BYTES) throw Error('La sesión supera el límite de 12 MB.');
  let raw: { version?: number; cpu?: unknown; memory?: unknown; pc?: unknown; soc?: unknown; lesson?: unknown; guide?: GuidePart };
  try {
    raw = JSON.parse(text);
  } catch {
    throw Error('El archivo no es una sesión de SILICIO (JSON inválido).');
  }
  if (raw?.version === 1 || raw?.version === 2) return { kind: 'legacy', cpu: readSession(text) };
  if (raw?.version !== 3) throw Error('Formato de sesión no admitido.');
  for (const part of ['cpu', 'memory', 'pc', 'soc', 'lesson'] as const)
    if (raw[part] === undefined) throw Error('La sesión v3 está incompleta: falta «' + part + '».');
  const cpu = readSession(JSON.stringify(raw.cpu));
  const guide = raw.guide;
  if (guide !== undefined && (typeof guide.pathId !== 'string' || guide.pathId.length > 60 || !Number.isInteger(guide.index) || guide.index < 0 || guide.index > 16)) throw Error('Guía inválida.');
  return { kind: 'v3', lab: { cpu, memory: readMemory(raw.memory), pc: readPc(raw.pc), soc: readSoc(raw.soc), lesson: readLesson(raw.lesson), ...(guide ? { guide } : {}) } };
}

/** The v3 envelope, ready to store or download; `cpu` is the v2 object of the 8086 session. */
export function writeLabSession(cpuV2: unknown, parts: Omit<LabV3, 'cpu'>, pretty = false): string {
  return JSON.stringify({ version: 3, cpu: cpuV2, ...parts }, null, pretty ? 2 : undefined);
}

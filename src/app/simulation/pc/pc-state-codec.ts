import { FILE_NAMES } from './pc-isa';
import { FRAMEBUFFER_SIZE, INPUT_SIZE, PROGRAM_SIZE, WORK_SIZE, type Monitor, type PcState } from './pc-model';
import { MAX_FILE_BYTES } from './pc-files';

const int32 = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= -2147483648 && (v as number) <= 4294967295;
const isWords = (v: unknown, length: number): v is number[] => Array.isArray(v) && v.length === length && v.every(int32);
const bool = (v: unknown) => typeof v === 'boolean';
const fail = (what: string): never => {
  throw Error('Estado del PC inválido: ' + what + '.');
};

/** Checks a PC state that came from a file or the autosave; throws before anything is used, copies what it keeps. */
export function readPcState(raw: unknown): PcState {
  const s = raw as PcState;
  if (!s || typeof s !== 'object') return fail('no es un objeto');
  if (s.power !== 'on' && s.power !== 'off') fail('alimentación');
  for (const k of ['pc', 'ir', 'mar', 'mdr'] as const) if (!int32(s[k])) fail(k);
  if (!Array.isArray(s.regs) || s.regs.length !== 4 || !s.regs.every(int32)) fail('registros');
  if (!s.flags || !(['Z', 'N', 'C', 'V'] as const).every((f) => bool(s.flags[f]))) fail('flags');
  const ram = s.ram;
  if (!ram || !isWords(ram.program, PROGRAM_SIZE) || !isWords(ram.input, INPUT_SIZE) || !isWords(ram.work, WORK_SIZE) || !isWords(ram.framebuffer, FRAMEBUFFER_SIZE)) fail('RAM');
  if (!s.ssd || typeof s.ssd !== 'object' || Array.isArray(s.ssd)) fail('SSD');
  const ssd: Record<string, number[]> = {};
  for (const [name, bytes] of Object.entries(s.ssd)) {
    if (!(FILE_NAMES as readonly string[]).includes(name)) fail('archivo desconocido ' + name);
    if (!Array.isArray(bytes) || bytes.length > MAX_FILE_BYTES || !bytes.every((b) => Number.isInteger(b) && b >= 0 && b <= 255)) fail('contenido de ' + name);
    ssd[name] = [...bytes];
  }
  if (!Array.isArray(s.keyboard) || s.keyboard.length > 64 || !s.keyboard.every((k) => Number.isInteger(k) && k >= 0 && k <= 0x10ffff)) fail('teclado');
  const i = s.interrupt;
  if (!i || !bool(i.enabled) || !bool(i.inService) || !bool(i.shadow)) fail('interrupciones');
  if (i.saved && (!int32(i.saved.pc) || !(['Z', 'N', 'C', 'V'] as const).every((f) => bool(i.saved!.flags?.[f])))) fail('interrupción guardada');
  const m = s.monitor as Monitor;
  if (!m || !['off', 'text', 'image', 'number', 'error'].includes(m.mode) || typeof m.text !== 'string' || m.text.length > 20000 || !Array.isArray(m.pixels) || m.pixels.length > 64 || !m.pixels.every((p) => Number.isInteger(p) && p >= 0 && p <= 255)) fail('monitor');
  const c = s.counters;
  if (!c || !([c.instructions, c.polls, c.interrupts] as unknown[]).every((n) => Number.isInteger(n) && (n as number) >= 0)) fail('contadores');
  if (!Array.isArray(s.inputs) || s.inputs.length > 4096 || !s.inputs.every((x) => x && x.kind === 'key' && Number.isInteger(x.at) && x.at >= 0 && Number.isInteger(x.code))) fail('entradas');
  if (typeof s.halted !== 'boolean') fail('detenido');
  return {
    power: s.power, pc: s.pc, ir: s.ir, mar: s.mar, mdr: s.mdr, regs: [...s.regs], flags: { ...s.flags },
    ram: { program: [...ram.program], input: [...ram.input], work: [...ram.work], framebuffer: [...ram.framebuffer] },
    ssd, keyboard: [...s.keyboard],
    interrupt: { enabled: i.enabled, inService: i.inService, shadow: i.shadow, ...(i.saved ? { saved: { pc: i.saved.pc, flags: { ...i.saved.flags } } } : {}) },
    monitor: { mode: m.mode, text: m.text, pixels: [...m.pixels], ...(m.number !== undefined ? { number: m.number } : {}), ...(m.message !== undefined ? { message: m.message } : {}) },
    halted: s.halted, counters: { instructions: c.instructions, polls: c.polls, interrupts: c.interrupts }, inputs: s.inputs.map((x) => ({ at: x.at, kind: 'key' as const, code: x.code })),
  };
}

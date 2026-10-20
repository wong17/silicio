import { Cpu8086, REGISTER_NAMES, Snapshot, Trace, type IoState } from './cpu8086';
export interface Session {
  branches?: { id: string; session: Session }[];
  version: 1;
  source: string;
  state: Snapshot;
  trace: Trace[];
  cursor: number;
  missionIndex: number;
  baseline?: Snapshot;
}
const flags = ['CF', 'PF', 'AF', 'ZF', 'SF', 'OF'] as const;
/** Screen, cursor and queued keys; sessions written before the screen existed simply have none. */
function readIo(value: unknown): IoState {
  const io = value as IoState;
  if (
    !io ||
    typeof io.screen !== 'string' ||
    io.screen.length > 2100 ||
    !Number.isInteger(io.cursor) ||
    io.cursor < 0 ||
    io.cursor >= 2000 ||
    !Array.isArray(io.keyboard) ||
    io.keyboard.length > 256 ||
    io.keyboard.some((k) => !Number.isInteger(k) || k < 0 || k > 255)
  )
    throw Error('Pantalla o teclado inválidos.');
  const result: IoState = { screen: io.screen, cursor: io.cursor, keyboard: [...io.keyboard] };
  if (io.ports !== undefined) {
    const entries = Object.entries(io.ports);
    if (entries.length > 256 || entries.some(([k, v]) => !/^\d+$/.test(k) || Number(k) > 0xffff || !Number.isInteger(v) || v < 0 || v > 255))
      throw Error('Puertos inválidos.');
    result.ports = { ...io.ports };
  }
  return result;
}
export function readSession(text: string): Session {
  if (text.length > 12_000_000) throw Error('La sesión supera el límite de 12 MB.');
  const raw = JSON.parse(text);
  if (raw?.version === 2) {
    if (
      !raw.current ||
      raw.current.version !== 1 ||
      !Array.isArray(raw.branches) ||
      raw.branches.length > 8
    )
      throw Error('Archivo de ramas inválido.');
    const ids = new Set<string>();
    const branches = raw.branches.map((b: { id: string; session: unknown }) => {
      if (
        typeof b.id !== 'string' ||
        b.id.length > 100 ||
        ids.has(b.id) ||
        (b.session as { version?: number })?.version !== 1
      )
        throw Error('Rama inválida.');
      ids.add(b.id);
      return { id: b.id, session: readSession(JSON.stringify(b.session)) };
    });
    return { ...readSession(JSON.stringify(raw.current)), branches };
  }
  if (
    raw?.version !== 1 ||
    typeof raw.source !== 'string' ||
    raw.source.length > 65536 ||
    !Array.isArray(raw.trace) ||
    raw.trace.length > 2048
  )
    throw Error('Formato de sesión no admitido.');
  const cpu = new Cpu8086();
  cpu.load(raw.source);
  function snapshot(s: unknown): Snapshot {
    if (!s || typeof s !== 'object') throw Error('Estado inválido.');
    const obj = s as Snapshot;
    if (
      typeof obj.halted !== 'boolean' ||
      !obj.registers ||
      !obj.flags ||
      !obj.memory ||
      typeof obj.memory !== 'object' ||
      Array.isArray(obj.memory)
    )
      throw Error('Estado incompleto.');
    const result = cpu.snapshot();
    result.memory = {};
    result.halted = obj.halted;
    if (obj.io !== undefined) result.io = readIo(obj.io);
    for (const r of [...REGISTER_NAMES, 'CS', 'DS', 'SS', 'ES', 'IP'] as const) {
      const v = obj.registers[r];
      if (!Number.isInteger(v) || v < 0 || v > 65535) throw Error('Registro inválido: ' + r);
      result.registers[r] = v;
    }
    for (const f of flags) {
      if (typeof obj.flags[f] !== 'boolean') throw Error('Flag inválido: ' + f);
      result.flags[f] = obj.flags[f];
    }
    const entries = Object.entries(obj.memory);
    if (entries.length > 65536) throw Error('Demasiados bytes en la sesión.');
    for (const [key, v] of entries) {
      const address = Number(key);
      if (
        !/^\d+$/.test(key) ||
        !Number.isInteger(address) ||
        address < 0 ||
        address > 0xfffff ||
        !Number.isInteger(v) ||
        v < 0 ||
        v > 255
      )
        throw Error('Byte o dirección inválidos.');
      result.memory[address] = v;
    }
    return result;
  }
  const trace: Trace[] = raw.trace.map((event: { before: unknown; after: unknown }) => {
    const before = snapshot(event.before),
      after = snapshot(event.after);
    const probe = new Cpu8086();
    probe.restore(before);
    probe.instructions = cpu.instructions;
    const actual = probe.step();
    if (!actual) throw Error('Traza imposible después de HLT.');
    const equal =
      Object.keys(after.registers).every(
        (r) =>
          after.registers[r as keyof Snapshot['registers']] ===
          actual.after.registers[r as keyof Snapshot['registers']],
      ) &&
      flags.every((f) => after.flags[f] === actual.after.flags[f]) &&
      after.halted === actual.after.halted &&
      after.io.screen === actual.after.io.screen &&
      after.io.cursor === actual.after.io.cursor &&
      after.io.keyboard.join() === actual.after.io.keyboard.join();
    const keys = new Set([...Object.keys(after.memory), ...Object.keys(actual.after.memory)]);
    if (!equal || [...keys].some((k) => after.memory[Number(k)] !== actual.after.memory[Number(k)]))
      throw Error('La traza no coincide con la instrucción ejecutada.');
    return actual;
  });
  const cursor = raw.cursor ?? trace.length - 1;
  if (!Number.isInteger(cursor) || cursor < -1 || cursor >= trace.length)
    throw Error('Posición del historial inválida.');
  const state = snapshot(raw.state),
    baseline = raw.baseline ? snapshot(raw.baseline) : undefined;
  const missionIndex =
    Number.isInteger(raw.missionIndex) && raw.missionIndex >= 0 && raw.missionIndex < 18
      ? raw.missionIndex
      : 0;
  return { version: 1, source: raw.source, state, trace, cursor, missionIndex, baseline };
}

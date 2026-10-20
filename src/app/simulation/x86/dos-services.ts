import { putChar, putText } from './text-screen';
import type { HaltReason, Machine, MemoryPort } from './types';
import { hex, word } from './types';

export type DosOutcome =
  | { kind: 'done' }
  | { kind: 'wait'; service: 0x01 | 0x0a }
  | { kind: 'halt'; reason: HaltReason };

const MAX_STRING = 4096;

/**
 * INT 20h and the INT 21h services of the course, simulated: on a real PC the interrupt pushes FLAGS, CS
 * and IP and jumps through the vector at 0000:0084h; here the service runs directly on the screen model.
 */
export function interrupt(vector: number, m: Machine, port: MemoryPort): DosOutcome {
  if (vector === 0x20) return { kind: 'halt', reason: 'int20' };
  const r = m.registers;
  const ah = (r.AX >>> 8) & 255;
  const setAl = (v: number) => (r.AX = (r.AX & 0xff00) | (v & 255));
  switch (ah) {
    case 0x01: {
      if (!m.io.keyboard.length) return { kind: 'wait', service: 0x01 };
      const [key, ...rest] = m.io.keyboard;
      m.io = putChar({ ...m.io, keyboard: rest }, key);
      setAl(key);
      return { kind: 'done' };
    }
    case 0x02: {
      const ch = r.DX & 255;
      m.io = putChar(m.io, ch);
      setAl(ch);
      return { kind: 'done' };
    }
    case 0x09: {
      let text = '';
      for (let k = 0; ; k++) {
        if (k >= MAX_STRING) throw Error('La cadena de INT 21h/09h no termina en $');
        const b = port.readByte(r.DS, word(r.DX + k));
        if (b === 0x24) break;
        text += String.fromCharCode(b);
      }
      m.io = putText(m.io, text);
      setAl(0x24);
      return { kind: 'done' };
    }
    case 0x0a: {
      const end = m.io.keyboard.indexOf(13);
      if (end < 0) return { kind: 'wait', service: 0x0a };
      const capacity = Math.max(port.readByte(r.DS, r.DX) - 1, 0);
      const typed = m.io.keyboard.slice(0, end).slice(0, capacity);
      let io = { ...m.io, keyboard: m.io.keyboard.slice(end + 1) };
      typed.forEach((key, n) => {
        port.writeByte(r.DS, word(r.DX + 2 + n), key);
        io = putChar(io, key);
      });
      port.writeByte(r.DS, word(r.DX + 2 + typed.length), 13);
      port.writeByte(r.DS, word(r.DX + 1), typed.length);
      m.io = putChar(io, 13);
      return { kind: 'done' };
    }
    case 0x4c:
      return { kind: 'halt', reason: 'int21-4c' };
    default:
      throw Error(
        'INT 21h con AH=' + hex(ah, 2) + 'h está fuera del subconjunto (admite 01h, 02h, 09h, 0Ah y 4Ch)',
      );
  }
}

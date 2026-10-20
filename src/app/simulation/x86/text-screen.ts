import type { IoState } from './types';

export const SCREEN_COLUMNS = 80;
export const SCREEN_ROWS = 25;

/** Types one character on the emulated 80×25 text screen; pure, returns a new state. */
export function putChar(io: IoState, code: number): IoState {
  const rows = io.screen.split('\n');
  let row = Math.floor(io.cursor / SCREEN_COLUMNS);
  let col = io.cursor % SCREEN_COLUMNS;
  while (rows.length <= row) rows.push('');
  if (code === 13) col = 0;
  else if (code === 10) row++;
  else if (code === 8) col = Math.max(0, col - 1);
  else if (code === 7) {
    /* the bell makes no mark on the screen */
  } else {
    const text = rows[row].padEnd(col, ' ');
    rows[row] = text.slice(0, col) + String.fromCharCode(code & 255) + text.slice(col + 1);
    if (++col === SCREEN_COLUMNS) {
      col = 0;
      row++;
    }
  }
  while (rows.length <= row) rows.push('');
  while (row >= SCREEN_ROWS) {
    rows.shift();
    row--;
  }
  return { ...io, screen: rows.join('\n'), cursor: row * SCREEN_COLUMNS + col };
}

export const putText = (io: IoState, text: string): IoState =>
  [...text].reduce((state, ch) => putChar(state, ch.charCodeAt(0)), io);

/** Key codes for a typed text; `\n` becomes Enter (13). */
export const keyCodes = (text: string): number[] =>
  [...text].map((ch) => (ch === '\n' ? 13 : ch.charCodeAt(0) & 255));

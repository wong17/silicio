/** The four states of a bus cycle as the didactic scope shows them; they are steps, not nanoseconds. */
export const T_STATES = ['T1', 'T2', 'T3', 'T4'] as const;
export type Channel = 'ALE' | 'RD' | 'WR';

export interface ScopeReading {
  step: number;
  state: (typeof T_STATES)[number];
  /** Logic level of the channel in this step: 1 high, 0 low. */
  level: 0 | 1;
  text: string;
}

/**
 * Levels of each channel over T1 to T4. ALE pulses high at T1 to latch the address; RD and WR are active
 * low and drop only in the cycles that read or write.
 */
export function scopeLevels(channel: Channel, reads: boolean, writes: boolean): (0 | 1)[] {
  if (channel === 'ALE') return [1, 0, 0, 0];
  const active = channel === 'RD' ? reads : writes;
  return active ? [1, 0, 0, 1] : [1, 1, 1, 1];
}

const MEANING: Record<Channel, (level: number, active: boolean) => string> = {
  ALE: (level) =>
    level
      ? 'ALE alto: en las líneas AD hay una dirección y debe retenerse.'
      : 'ALE bajo: la dirección ya está retenida; las líneas AD pueden llevar datos.',
  RD: (level, active) =>
    active
      ? level
        ? 'RD alto: todavía no se lee.'
        : 'RD bajo: el procesador está leyendo del bus.'
      : 'RD alto: esta instrucción no lee en este ciclo.',
  WR: (level, active) =>
    active
      ? level
        ? 'WR alto: todavía no se escribe.'
        : 'WR bajo: el procesador está escribiendo en el bus.'
      : 'WR alto: esta instrucción no escribe en este ciclo.',
};

/** What the cursor reads at `step` (0 to 3) on the given channel. */
export function readScope(channel: Channel, reads: boolean, writes: boolean, step: number): ScopeReading {
  const levels = scopeLevels(channel, reads, writes);
  const i = Math.min(T_STATES.length - 1, Math.max(0, step));
  const active = channel === 'RD' ? reads : channel === 'WR' ? writes : true;
  return {
    step: i,
    state: T_STATES[i],
    level: levels[i],
    text: `${T_STATES[i]} · ${MEANING[channel](levels[i], active)}`,
  };
}

/** SVG path of the channel over the 280-unit width of the scope. */
export function scopePath(channel: Channel, reads: boolean, writes: boolean): string {
  const levels = scopeLevels(channel, reads, writes);
  const high = 25,
    low = 70,
    width = 70;
  let d = '';
  levels.forEach((level, i) => {
    const y = level ? high : low;
    const x0 = 20 + i * width;
    d += i === 0 ? `M${x0} ${y}` : `V${y}`;
    d += `h${width}`;
  });
  return d;
}

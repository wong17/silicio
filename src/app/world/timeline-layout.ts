/** Frames shown at once on the chronoscope tape: the cursor frame and three on each side. */
export const TAPE_VISIBLE = 7;
export const TAPE_PITCH = 0.92;
export const TAPE_SLOTS = 16;
export const BRANCH_SLOTS = 8;

export interface TimelineState {
  /** Index of the executed step shown, or -1 before the first one. */
  cursor: number;
  /** Executed steps in the timeline. */
  total: number;
  /** The most recent archived alternative: where it forks and what it ran. */
  branch?: { origin: number; texts: string[] };
}

export const EMPTY_TIMELINE: TimelineState = { cursor: -1, total: 0 };

/** Index of the first step that is shown on the tape (the tape holds the last 16). */
export function tapeBase(total: number): number {
  return Math.max(0, total - TAPE_SLOTS);
}

/** Slot of the cursor frame inside the tape, or 0 when the timeline has not started. */
export function cursorSlot(t: TimelineState): number {
  return Math.min(TAPE_SLOTS - 1, Math.max(0, t.cursor - tapeBase(t.total)));
}

/** X offset of the tape so that the cursor frame sits under the fixed window at x = 0. */
export function tapeOffset(t: TimelineState): number {
  return -cursorSlot(t) * TAPE_PITCH;
}

/** True when a frame is near enough to the window to be drawn. */
export function slotVisible(slot: number, t: TimelineState): boolean {
  return Math.abs(slot - cursorSlot(t)) <= (TAPE_VISIBLE - 1) / 2;
}

export interface BranchFrame {
  /** Slot on the tape where this branch frame stands. */
  slot: number;
  text: string;
  /** The same slot on the main lane ran something else (or nothing). */
  differs: boolean;
}

/**
 * Frames of the second lane. The branch starts at its origin: the first frame is at `origin` and every
 * frame after it stands beside the main lane's frame of the same index, marked when it differs.
 */
export function branchFrames(t: TimelineState, mainTexts: string[]): BranchFrame[] {
  if (!t.branch) return [];
  const base = tapeBase(t.total);
  const out: BranchFrame[] = [];
  t.branch.texts.forEach((text, i) => {
    const index = t.branch!.origin + i;
    const slot = index - base;
    if (slot < 0 || slot >= TAPE_SLOTS || out.length >= BRANCH_SLOTS) return;
    out.push({ slot, text, differs: mainTexts[index] !== text });
  });
  return out;
}

/** Index of the first step where two timelines stop being identical. */
export function forkOrigin(main: string[], other: string[]): number {
  let i = 0;
  while (i < main.length && i < other.length && main[i] === other[i]) i++;
  return i;
}

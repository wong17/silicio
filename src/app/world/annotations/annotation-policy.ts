/** A piece that could carry a name over the scene, as seen from the camera now. */
export interface AnnotationCandidate {
  id: string;
  /** Anchor on the canvas, CSS pixels. */
  x: number;
  y: number;
  /** In front of the camera and inside the view. */
  onScreen: boolean;
  /** Something nearer to the camera covers the anchor in this sample. */
  occluded: boolean;
}

export interface PolicyInput {
  candidates: readonly AnnotationCandidate[];
  selected: string | null;
  hovered: string | null;
  /** Pieces that work in the current step. */
  active: readonly string[];
  /** Small or short scenes name fewer pieces. */
  compact: boolean;
}

export const NAME_LIMIT = { wide: 6, compact: 3 };

/**
 * Two consecutive samples are needed to change a piece from visible to hidden or back, so a label does not
 * blink when an edge of another piece crosses its anchor for an instant.
 */
export class VisibilityMemory {
  private readonly states = new Map<string, { visible: boolean; pending: number }>();

  visible(id: string, occluded: boolean): boolean {
    const state = this.states.get(id) ?? { visible: true, pending: 0 };
    if (occluded === state.visible) {
      state.pending++;
      if (state.pending >= 2) {
        state.visible = !state.visible;
        state.pending = 0;
      }
    } else state.pending = 0;
    this.states.set(id, state);
    return state.visible;
  }

  forget(): void {
    this.states.clear();
  }
}

/**
 * Which pieces get a name: the selection, the hovered piece and those of the current step first, then the
 * nearest to the selection (or to the centre of the view), never more than the limit for the scene size.
 */
export function chooseNamed(input: PolicyInput, memory: VisibilityMemory): string[] {
  const limit = input.compact ? NAME_LIMIT.compact : NAME_LIMIT.wide;
  const visible = input.candidates.filter((c) => memory.visible(c.id, c.occluded || !c.onScreen) && c.onScreen);
  const byId = new Map(visible.map((c) => [c.id, c]));
  const ordered: string[] = [];
  const add = (id: string | null) => {
    if (id && byId.has(id) && !ordered.includes(id)) ordered.push(id);
  };
  add(input.selected);
  add(input.hovered);
  input.active.forEach(add);
  const focus = (input.selected && byId.get(input.selected)) || null;
  const cx = focus ? focus.x : visible.reduce((s, c) => s + c.x, 0) / (visible.length || 1);
  const cy = focus ? focus.y : visible.reduce((s, c) => s + c.y, 0) / (visible.length || 1);
  [...visible]
    .sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy) || a.id.localeCompare(b.id))
    .forEach((c) => add(c.id));
  return ordered.slice(0, limit);
}

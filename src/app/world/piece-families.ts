import type { PieceDefinition } from './interaction-registry';

export interface PieceFamily {
  id: string;
  label: string;
  /** Position inside the family, used to place the piece in its real-shape selector. */
  index: number;
  layout: 'dip40' | 'grid' | 'timeline' | 'list';
  columns?: number;
}

const RULES: { match: RegExp; id: string; label: string; layout: PieceFamily['layout']; columns?: number; index: (m: RegExpMatchArray) => number }[] = [
  { match: /^pin-(\d+)$/, id: 'pins', label: 'Terminales', layout: 'dip40', columns: 20, index: (m) => Number(m[1]) - 1 },
  { match: /^dram-(\d)-(\d)$/, id: 'dram', label: '2164A', layout: 'grid', columns: 8, index: (m) => Number(m[1]) * 8 + Number(m[2]) },
  { match: /^dimm-chip-(\d+)$/, id: 'dimm-chips', label: 'Chips DDR4', layout: 'grid', columns: 8, index: (m) => Number(m[1]) },
  { match: /^cell-(\d+)$/, id: 'cells', label: 'Bytes', layout: 'grid', columns: 16, index: (m) => Number(m[1]) },
  { match: /^frame-(\d+)$/, id: 'frames', label: 'Estados', layout: 'timeline', index: (m) => Number(m[1]) },
  { match: /^tool(?:-(\d+))?$/, id: 'tools', label: 'Herramientas', layout: 'list', index: (m) => (m[1] ? Number(m[1]) : 0) },
];

/** The family a piece id belongs to, or undefined for a piece that stands on its own. */
export function familyOf(id: string): PieceFamily | undefined {
  for (const r of RULES) {
    const m = id.match(r.match);
    if (m) return { id: r.id, label: r.label, index: r.index(m), layout: r.layout, columns: r.columns };
  }
  return undefined;
}

export interface TrayPiece {
  kind: 'piece';
  piece: PieceDefinition;
}
export interface TrayFamily {
  kind: 'family';
  id: string;
  /** «Terminales ×40» */
  label: string;
  layout: PieceFamily['layout'];
  columns?: number;
  members: PieceDefinition[];
}
export type TrayItem = TrayPiece | TrayFamily;

/** Collapses repeated pieces into one card per family, keeping the order of first appearance. */
export function groupPieces(pieces: PieceDefinition[]): TrayItem[] {
  const out: TrayItem[] = [];
  const families = new Map<string, TrayFamily>();
  for (const piece of pieces) {
    const f = piece.family ?? familyOf(piece.id);
    if (!f || f.layout === 'list') {
      // A "list" family still groups, but only when it has several members.
      if (!f) {
        out.push({ kind: 'piece', piece });
        continue;
      }
    }
    let group = families.get(f.id);
    if (!group) {
      group = { kind: 'family', id: f.id, label: f.label, layout: f.layout, columns: f.columns, members: [] };
      families.set(f.id, group);
      out.push(group);
    }
    group.members.push(piece);
  }
  for (const item of out)
    if (item.kind === 'family') {
      item.members.sort((a, b) => (a.family?.index ?? familyOf(a.id)!.index) - (b.family?.index ?? familyOf(b.id)!.index));
      item.label = `${item.label} ×${item.members.length}`;
    }
  // A family of one is just a piece.
  return out.map((item) =>
    item.kind === 'family' && item.members.length === 1 ? { kind: 'piece', piece: item.members[0] } : item,
  );
}

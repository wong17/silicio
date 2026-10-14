import { describe, expect, it } from 'vitest';
import { accessibleCatalog } from './piece-definitions';
import { groupPieces } from './piece-families';

describe('familias de piezas', () => {
  it('forty_pins_collapse_into_one_family', () => {
    const items = groupPieces(accessibleCatalog('8086', 'classic', 0).filter((p) => p.scope === 'model'));
    const pins = items.find((i) => i.kind === 'family' && i.id === 'pins');
    expect(pins && pins.kind === 'family' && pins.members.length).toBe(40);
    expect(pins && pins.kind === 'family' && pins.label).toBe('Terminales ×40');
    expect(items.filter((i) => i.kind === 'piece').length).toBeLessThan(25);
  });
  it('bench_objects_live_in_their_own_scope', () => {
    const catalog = accessibleCatalog('8086', 'classic', 0);
    expect(catalog.find((p) => p.id === 'mug')?.scope).toBe('bench');
    expect(catalog.find((p) => p.id === 'alu')?.scope).toBe('model');
  });
  it('members_follow_their_physical_order', () => {
    const items = groupPieces(accessibleCatalog('memory', 'classic', 0).filter((p) => p.scope === 'model'));
    const cells = items.find((i) => i.kind === 'family' && i.id === 'cells');
    expect(cells?.kind === 'family' && cells.members.map((m) => m.id).slice(0, 3)).toEqual(['cell-0', 'cell-1', 'cell-2']);
    const dram = items.find((i) => i.kind === 'family' && i.id === 'dram');
    expect(dram?.kind === 'family' && dram.members.length).toBe(16);
  });
  it('a_single_piece_is_never_a_family', () => {
    const items = groupPieces(accessibleCatalog('time', 'classic', 0).filter((p) => p.scope === 'model'));
    expect(items.every((i) => i.kind === 'piece')).toBe(true);
  });
});

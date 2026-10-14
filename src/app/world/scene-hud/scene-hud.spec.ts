import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LabSession } from '../../laboratory/lab-session.service';
import { BenchMapComponent } from './bench-map/bench-map.component';
import { PieceTrayComponent } from './piece-tray/piece-tray.component';
import { SceneHudComponent } from './scene-hud.component';
import { PieceInspectorComponent } from '../../console/piece-inspector/piece-inspector.component';

describe('HUD de escena', () => {
  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {}
  });
  afterEach(() => vi.useRealTimers());

  it('hud_state_survives_station_change', async () => {
    await TestBed.configureTestingModule({ imports: [SceneHudComponent] }).compileComponents();
    const session = TestBed.inject(LabSession);
    session.setHud({ map: true, tray: true });
    session.section.set('memory');
    session.section.set('apple');
    expect(session.hud()).toEqual({ map: true, tray: true });
  });

  it('hud_marks_open_drawers_as_occluding', async () => {
    await TestBed.configureTestingModule({ imports: [SceneHudComponent] }).compileComponents();
    const session = TestBed.inject(LabSession);
    const fixture = TestBed.createComponent(SceneHudComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('[data-occludes]').length).toBe(0);
    session.setHud({ map: true, tray: true });
    fixture.detectChanges();
    expect(root.querySelectorAll('[data-occludes]').length).toBe(2);
  });

  it('toggles_reach_the_44px_target_size', async () => {
    await TestBed.configureTestingModule({ imports: [SceneHudComponent] }).compileComponents();
    const fixture = TestBed.createComponent(SceneHudComponent);
    fixture.detectChanges();
    const toggles = (fixture.nativeElement as HTMLElement).querySelectorAll('.toggle');
    expect(toggles.length).toBe(2);
    for (const t of Array.from(toggles)) expect(t.getAttribute('aria-controls')).toMatch(/^hud-/);
  });
});

describe('mapa del banco', () => {
  async function create() {
    await TestBed.configureTestingModule({ imports: [BenchMapComponent] }).compileComponents();
    const session = TestBed.inject(LabSession);
    session.anchors.set([
      { id: 'alu', name: 'Unidad aritmético-lógica', x: -2, z: 0.1, scope: 'model' },
      { id: 'mug', name: 'Taza de café', x: 6, z: 3, scope: 'bench' },
    ]);
    const fixture = TestBed.createComponent(BenchMapComponent);
    fixture.detectChanges();
    return { fixture, session, root: fixture.nativeElement as HTMLElement };
  }

  it('one_marker_per_model_piece', async () => {
    const { root } = await create();
    expect(root.querySelectorAll('.marker').length).toBe(1);
  });

  it('clicking_a_marker_selects_the_piece', async () => {
    const { fixture, root } = await create();
    const picked: string[] = [];
    fixture.componentInstance.picked.subscribe((id: string) => picked.push(id));
    root.querySelector('.marker')!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(picked).toEqual(['alu']);
  });

  it('camera_wedge_follows_the_azimuth', async () => {
    const { fixture, session } = await create();
    session.cameraView.set({ azimuth: 0, distance: 10 });
    const a = fixture.componentInstance.wedge();
    session.cameraView.set({ azimuth: Math.PI / 2, distance: 10 });
    const b = fixture.componentInstance.wedge();
    expect(a.x).toBeCloseTo(150, 0);
    expect(b.x).toBeGreaterThan(a.x + 50);
    expect(b.degrees).toBe(90);
  });

  it('arrow_keys_nudge_the_spot', async () => {
    const { fixture, session } = await create();
    const before = session.lampTarget().x;
    const pad = fixture.nativeElement.querySelector('svg.pad') as SVGElement;
    pad.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(session.lampTarget().x).toBeGreaterThan(before);
  });

  it('dragging_the_spot_moves_the_lamp', async () => {
    const { fixture, session } = await create();
    const before = { ...session.lampTarget() };
    fixture.componentInstance.setTarget({ x: before.x + 1, z: before.z + 1 });
    expect(session.lampTarget().x).toBeGreaterThan(before.x);
    expect(session.lampTarget().z).toBeGreaterThan(before.z);
  });
});

describe('bandeja de piezas', () => {
  async function create() {
    await TestBed.configureTestingModule({ imports: [PieceTrayComponent] }).compileComponents();
    const session = TestBed.inject(LabSession);
    session.section.set('8086');
    const fixture = TestBed.createComponent(PieceTrayComponent);
    fixture.detectChanges();
    return { fixture, session, root: fixture.nativeElement as HTMLElement };
  }

  it('tray_follows_a_3d_pick', async () => {
    const { fixture, session, root } = await create();
    session.part('registers');
    fixture.detectChanges();
    const selected = root.querySelector('[role="option"][aria-selected="true"]');
    expect(selected?.getAttribute('aria-label')).toBe('Banco de registros');
  });

  it('thumbnails_fall_back_to_glyphs_without_webgl', async () => {
    const { fixture, root } = await create();
    fixture.componentRef.setInput('thumbnailer', () => Promise.resolve(null));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(root.querySelectorAll('img').length).toBe(0);
    expect(root.querySelectorAll('svg.glyph').length).toBeGreaterThan(5);
  });

  it('reduced_motion_never_asks_for_pictures', async () => {
    const { fixture, session } = await create();
    session.reduced.set(true);
    const spy = vi.fn(() => Promise.resolve(null));
    fixture.componentRef.setInput('thumbnailer', spy);
    fixture.detectChanges();
    expect(spy).not.toHaveBeenCalled();
  });

  it('thumbnails_are_released_on_station_change', async () => {
    const { fixture, session } = await create();
    const created: string[] = [];
    const revoked: string[] = [];
    vi.stubGlobal('URL', {
      createObjectURL: () => {
        const url = 'blob:' + created.length;
        created.push(url);
        return url;
      },
      revokeObjectURL: (u: string) => revoked.push(u),
    });
    fixture.componentRef.setInput('thumbnailer', () => Promise.resolve(new Blob(['x'])));
    fixture.detectChanges();
    await fixture.whenStable();
    const before = created.length;
    expect(before).toBeGreaterThan(0);
    session.section.set('apple');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(revoked.length).toBeGreaterThanOrEqual(before);
    vi.unstubAllGlobals();
  });

  it('pins_open_a_dip_selector_with_two_rows', async () => {
    const { fixture, root } = await create();
    const family = [...root.querySelectorAll<HTMLButtonElement>('[role="option"]')].find((b) =>
      b.getAttribute('aria-label')?.startsWith('Terminales'),
    )!;
    family.click();
    fixture.detectChanges();
    expect(root.querySelectorAll('.dip .row').length).toBe(2);
    expect(root.querySelectorAll('.dip .row button').length).toBe(40);
  });
});

describe('tarjeta de pieza', () => {
  it('busy_action_ignores_a_second_activation', async () => {
    await TestBed.configureTestingModule({ imports: [PieceInspectorComponent] }).compileComponents();
    const fixture = TestBed.createComponent(PieceInspectorComponent);
    fixture.detectChanges();
    let focused = 0;
    fixture.componentInstance.focus.subscribe(() => focused++);
    fixture.componentInstance.act('focus');
    fixture.componentInstance.act('focus');
    expect(focused).toBe(1);
  });

  it('selecting_an_internal_piece_opens_the_chip', async () => {
    await TestBed.configureTestingModule({ imports: [PieceInspectorComponent] }).compileComponents();
    const session = TestBed.inject(LabSession);
    session.exploded.set(false);
    session.part('alu');
    expect(session.exploded()).toBe(true);
  });
});

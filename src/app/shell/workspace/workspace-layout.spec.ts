import {
  arrange,
  defaultLayout,
  dockPanel,
  floatPanel,
  LIMITS,
  minimizePanel,
  openPanel,
  parseLayout,
  sizeClassOf,
  type PanelSpec,
  type Rect,
  type WorkspaceLayout,
} from './workspace-layout';

const CPU: PanelSpec[] = [
  { id: 'program', title: 'Programa', zone: 'bottom', open: true },
  { id: 'state', title: 'Estado', zone: 'bottom', open: true },
  { id: 'inspector', title: 'Pieza', zone: 'right', open: false },
];

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

describe('workspace-layout / clases de tamaño', () => {
  it('sigue la tabla de §2.3', () => {
    expect(sizeClassOf({ width: 1366, height: 768 })).toBe('wide');
    expect(sizeClassOf({ width: 1024, height: 720 })).toBe('wide');
    expect(sizeClassOf({ width: 1023, height: 768 })).toBe('medium');
    expect(sizeClassOf({ width: 1280, height: 700 })).toBe('medium');
    expect(sizeClassOf({ width: 799, height: 900 })).toBe('narrow');
    expect(sizeClassOf({ width: 844, height: 390 })).toBe('short');
  });
});

describe('workspace-layout / distribución Estudiar', () => {
  const area = { width: 1366, height: 674 };

  it('pone Programa y Estado juntos abajo y deja la escena encima', () => {
    const r = arrange(defaultLayout(CPU, area), CPU, area);
    expect(r.mode).toBe('absolute');
    const program = r.placements.find((p) => p.id === 'program')!;
    const state = r.placements.find((p) => p.id === 'state')!;
    expect(program.rect.y).toBe(state.rect.y);
    expect(program.rect.width).toBeGreaterThanOrEqual(LIMITS.panelWidth);
    expect(state.rect.width).toBeGreaterThanOrEqual(LIMITS.panelWidth);
    expect(overlaps(program.rect, state.rect)).toBe(false);
    expect(overlaps(program.rect, r.scene)).toBe(false);
    expect(r.scene.width).toBeGreaterThanOrEqual(LIMITS.sceneWidth);
    expect(r.scene.height).toBeGreaterThanOrEqual(LIMITS.sceneHeight);
    expect(r.placements.some((p) => p.id === 'inspector')).toBe(false);
  });

  it('el panel anclado a la derecha ocupa toda la altura y estrecha escena y zona inferior', () => {
    const layout = openPanel(defaultLayout(CPU, area), 'inspector');
    const r = arrange(layout, CPU, area);
    const inspector = r.placements.find((p) => p.id === 'inspector')!;
    expect(inspector.zone).toBe('right');
    expect(inspector.rect.height).toBe(area.height);
    expect(r.scene.x + r.scene.width).toBeLessThanOrEqual(inspector.rect.x);
    for (const p of r.placements.filter((p) => p.zone === 'bottom'))
      expect(overlaps(p.rect, inspector.rect)).toBe(false);
  });
});

describe('workspace-layout / tamaños cambiantes', () => {
  it('a 390 px pasa a flujo vertical sin alterar la distribución guardada', () => {
    const layout = defaultLayout(CPU, { width: 1920, height: 950 });
    const wide = arrange(layout, CPU, { width: 1920, height: 950 });
    const narrow = arrange(layout, CPU, { width: 390, height: 700 });
    expect(narrow.mode).toBe('flow');
    expect(narrow.placements.map((p) => p.id)).toEqual(['program', 'state']);
    const back = arrange(layout, CPU, { width: 1920, height: 950 });
    expect(back.placements).toEqual(wide.placements);
  });

  it('a 1024×600 conserva la escena mínima y ajusta la zona inferior', () => {
    const layout = defaultLayout(CPU, { width: 1920, height: 950 });
    const r = arrange({ ...layout, bottom: 900 }, CPU, { width: 1024, height: 530 });
    expect(r.scene.height).toBeGreaterThanOrEqual(LIMITS.sceneHeight);
    expect(r.placements.every((p) => p.rect.y + p.rect.height <= 530)).toBe(true);
  });

  it('si la derecha no deja sitio a la pareja inferior, el panel sobrante flota dentro del área', () => {
    const area = { width: 820, height: 600 };
    const r = arrange(openPanel(defaultLayout(CPU, area), 'inspector'), CPU, area);
    const bottom = r.placements.filter((p) => p.zone === 'bottom');
    for (const p of bottom) expect(p.rect.width).toBeGreaterThanOrEqual(LIMITS.panelWidth);
    expect(r.scene.width).toBeGreaterThanOrEqual(LIMITS.sceneWidth);
    for (const p of r.placements) {
      expect(p.rect.x).toBeGreaterThanOrEqual(0);
      expect(p.rect.x + p.rect.width).toBeLessThanOrEqual(area.width);
    }
    expect(r.adjusted).toBe(true);
  });
});

describe('workspace-layout / flotar, anclar y minimizar', () => {
  const area = { width: 1366, height: 674 };

  it('una ventana flotante fuera del área vuelve con su cabecera visible', () => {
    const layout = floatPanel(defaultLayout(CPU, area), 'state', { x: 2000, y: -300, width: 5000, height: 50 });
    const state = arrange(layout, CPU, area).placements.find((p) => p.id === 'state')!;
    expect(state.zone).toBe('float');
    expect(state.rect.width).toBeLessThanOrEqual(area.width);
    expect(state.rect.height).toBeGreaterThanOrEqual(LIMITS.floatHeight);
    expect(state.rect.x + state.rect.width).toBeLessThanOrEqual(area.width);
    expect(state.rect.y).toBeGreaterThanOrEqual(0);
    expect(state.rect.y + LIMITS.header).toBeLessThanOrEqual(area.height);
  });

  it('una ventana que pasa a flotar aparece sobre la escena, sin tapar los paneles anclados', () => {
    const layout = floatPanel(dockPanel(defaultLayout(CPU, area), 'state', 'right'), 'program');
    const r = arrange(layout, CPU, area);
    const program = r.placements.find((p) => p.id === 'program')!;
    const state = r.placements.find((p) => p.id === 'state')!;
    expect(overlaps(program.rect, state.rect)).toBe(false);
    expect(program.rect.x + program.rect.width).toBeLessThanOrEqual(r.scene.x + r.scene.width);
  });

  it('mover a la derecha y volver abajo restaura el orden original', () => {
    const start = defaultLayout(CPU, area);
    const moved = dockPanel(dockPanel(start, 'program', 'right'), 'program', 'bottom');
    const ids = arrange(moved, CPU, area)
      .placements.filter((p) => p.zone === 'bottom')
      .sort((a, b) => a.rect.x - b.rect.x)
      .map((p) => p.id);
    expect(ids).toEqual(['program', 'state']);
  });

  it('minimizar saca el panel de su zona y lo lista para restaurarlo', () => {
    const r = arrange(minimizePanel(defaultLayout(CPU, area), 'state', true), CPU, area);
    expect(r.minimized).toEqual(['state']);
    const program = r.placements.find((p) => p.id === 'program')!;
    expect(program.rect.width).toBe(area.width);
  });

  it('Explorar minimiza todo y amplía la escena; Comparar deja la escena mínima', () => {
    const explore = arrange(defaultLayout(CPU, area, 'explore'), CPU, area);
    expect(explore.placements).toEqual([]);
    expect(explore.scene.height).toBe(area.height);
    const compare = arrange(defaultLayout(CPU, area, 'compare'), CPU, area);
    expect(compare.scene.height).toBe(LIMITS.sceneHeight);
  });
});

describe('workspace-layout / validación', () => {
  it('rechaza datos corruptos o de otra versión', () => {
    expect(parseLayout(null, CPU)).toBeNull();
    expect(parseLayout('{', CPU)).toBeNull();
    expect(parseLayout({ version: 9, panels: [] }, CPU)).toBeNull();
    expect(parseLayout({ version: 1, panels: 'x' }, CPU)).toBeNull();
  });

  it('descarta paneles desconocidos y completa los que faltan', () => {
    const raw: unknown = {
      version: 1,
      preset: 'study',
      bottom: 300,
      right: 380,
      maximized: 'ghost',
      panels: [
        { id: 'ghost', open: true, minimized: false, zone: 'bottom', float: null },
        { id: 'state', open: true, minimized: false, zone: 'right', float: null },
      ],
    };
    const layout = parseLayout(raw, CPU) as WorkspaceLayout;
    expect(layout.panels.map((p) => p.id).sort()).toEqual(['inspector', 'program', 'state']);
    expect(layout.panels.find((p) => p.id === 'state')!.zone).toBe('right');
    expect(layout.maximized).toBeNull();
  });
});

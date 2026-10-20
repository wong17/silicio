import { expect, test, type Page } from '@playwright/test';
import { open } from './helpers';

const MATRIX: [number, number][] = [
  [1920, 1080], [1440, 900], [1366, 768], [1280, 720], [1024, 768], [1024, 600],
  [800, 600], [768, 1024], [390, 844], [360, 640], [320, 568], [844, 390],
];

/** Regions that must never lie on top of each other (the scene bar floats over the stage by design). */
const ESSENTIAL = ['app-experience-nav .links', 'app-simulation-transport .bar', '.desk-area'];

async function overlaps(page: Page): Promise<string[]> {
  return page.evaluate((selectors) => {
    const boxes = selectors
      .map((s) => ({ s, el: document.querySelector(s) as HTMLElement | null }))
      .filter((x) => x.el && x.el.offsetParent !== null)
      .map((x) => ({ s: x.s, r: x.el!.getBoundingClientRect() }));
    const out: string[] = [];
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i].r;
        const b = boxes[j].r;
        const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (w > 2 && h > 2) out.push(boxes[i].s + ' × ' + boxes[j].s);
      }
    return out;
  }, ESSENTIAL);
}

test.describe('escritorio y maquetación', () => {
  for (const [width, height] of MATRIX) {
    for (const path of ['/8086', '/memory', '/machine', '/soc']) {
      test(`${path} a ${width}×${height}: sin desplazamiento horizontal ni regiones superpuestas`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await open(page, path);
        const scroll = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
        expect(scroll.sw, 'scrollWidth').toBeLessThanOrEqual(scroll.cw + 1);
        expect(await overlaps(page)).toEqual([]);
        await expect(page.locator('app-simulation-transport button[aria-label="Ejecutar un paso"]')).toBeVisible();
      });
    }
  }

  test('los objetivos táctiles de la barra única miden 44 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, '/8086');
    const sizes = await page
      .locator('app-simulation-transport button')
      .evaluateAll((els) => els.map((e) => [Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height)]));
    for (const [w, h] of sizes) {
      expect(w).toBeGreaterThanOrEqual(44);
      expect(h).toBeGreaterThanOrEqual(44);
    }
  });

  test('zoom de página al 200 %: la barra única y el escenario siguen utilizables', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 384 });
    await open(page, '/8086');
    await expect(page.locator('app-simulation-transport button[aria-label="Ejecutar un paso"]')).toBeVisible();
    const scroll = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    expect(scroll.sw).toBeLessThanOrEqual(scroll.cw + 1);
  });
});

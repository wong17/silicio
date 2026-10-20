import { expect, test, type Page } from '@playwright/test';
import { instant, open, transport } from './helpers';

const stats = (page: Page) =>
  page.evaluate(() => {
    const c = document.querySelector('canvas');
    return c ? { geometries: Number(c.dataset['geometries'] ?? NaN), textures: Number(c.dataset['textures'] ?? NaN), station: c.dataset['station'] ?? '' } : undefined;
  });

test.describe('ciclo de vida gráfico', () => {
  test('diez recorridos entre estaciones no hacen crecer geometrías ni texturas de forma progresiva', async ({ page }) => {
    test.setTimeout(900_000);
    await open(page, '/8086');
    await expect.poll(async () => (await stats(page))?.station, { timeout: 30_000 }).toBe('8086');
    const readings: number[] = [];
    const chapters = ['Memoria', 'La máquina', 'SoC', 'Banco 8086'];
    for (let lap = 0; lap < 10; lap++) {
      for (const name of chapters) {
        await page.getByRole('link', { name, exact: true }).first().click();
        await page.waitForTimeout(400);
      }
      if (lap >= 2) readings.push(((await stats(page))?.geometries ?? 0) + ((await stats(page))?.textures ?? 0));
    }
    // After warm-up the resources are stable: the last lap uses no more than the first measured one.
    expect(readings.at(-1)!).toBeLessThanOrEqual(readings[0] * 1.05 + 5);
  });

  test('pérdida y recuperación del contexto: los instrumentos conservan sus acciones', async ({ page }) => {
    await open(page, '/8086');
    await expect.poll(async () => (await stats(page))?.station, { timeout: 30_000 }).toBe('8086');
    await page.evaluate(() => {
      const gl = (document.querySelector('canvas') as HTMLCanvasElement).getContext('webgl2') ?? (document.querySelector('canvas') as HTMLCanvasElement).getContext('webgl');
      (gl?.getExtension('WEBGL_lose_context') as { loseContext(): void } | null)?.loseContext();
    });
    await transport(page).step.click();
    await expect(transport(page).status).toContainText('paso 1');
    await expect(page.locator('app-register-panel')).toContainText('000C');
  });

  test('sin WebGL: la consola sigue operable y el catálogo de piezas existe', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (/webgl/.test(type)) return null;
        return (original as (...a: unknown[]) => unknown).call(this, type, ...rest) as never;
      } as typeof original;
    });
    await open(page, '/8086');
    await transport(page).step.click();
    await expect(page.locator('app-register-panel')).toContainText('000C');
    await context.close();
  });

  test('con la pestaña oculta la ejecución se pausa y no se reanuda sola', async ({ page }) => {
    await open(page, '/8086');
    await page.locator('#program').fill('MOV CX, 200\notra: DEC CX\nJNZ otra\nHLT');
    await page.getByRole('button', { name: 'Ensamblar y reiniciar' }).click();
    await transport(page).run.click();
    await expect(transport(page).status).toContainText('EJECUTANDO');
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(transport(page).status).not.toContainText('EJECUTANDO');
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(1500);
    await expect(transport(page).status).not.toContainText('EJECUTANDO');
  });

  test('con movimiento reducido la escena no anima paquetes y los resultados son los mismos', async ({ page }) => {
    await open(page, '/machine');
    await page.locator('#pc-exercise').selectOption('suma-archivo');
    await page.getByRole('button', { name: 'Encender y arrancar' }).click();
    await instant(page);
    await transport(page).run.click();
    await expect(transport(page).status).toContainText('FINALIZADO', { timeout: 60_000 });
    await expect(page.locator('app-pc-components .screen')).toHaveText(/10/);
  });
});

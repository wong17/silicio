import { expect, type Page } from '@playwright/test';

/** Opens a chapter with a clean browser: no saved session, workspace or preferences. */
export async function open(page: Page, path: string): Promise<void> {
  await page.addInitScript(() => {
    try {
      if (!sessionStorage.getItem('e2e-cleared')) {
        localStorage.clear();
        sessionStorage.setItem('e2e-cleared', '1');
      }
    } catch {
      /* blocked storage is part of what the app must survive */
    }
  });
  await page.goto(path);
  await expect(page.locator('app-simulation-transport, app-atrium-portals').first()).toBeVisible({ timeout: 30_000 });
}

export async function chooseMission(page: Page, number: number): Promise<void> {
  const select = page.locator('#mission');
  const label = await select.locator('option', { hasText: String(number).padStart(2, '0') + ' /' }).first().textContent();
  await select.selectOption({ label: label!.trim() });
}

export const transport = (page: Page) => ({
  step: page.getByRole('button', { name: 'Ejecutar un paso' }),
  run: page.getByRole('button', { name: /Ejecutar continuamente|Pausar la ejecución/ }),
  back: page.getByRole('button', { name: 'Retroceder un paso' }),
  restart: page.getByRole('button', { name: 'Reiniciar el ejercicio' }),
  status: page.locator('app-simulation-transport .status'),
});

/** Picks the fastest pace so long programs finish within a test. */
export async function instant(page: Page): Promise<void> {
  await page.getByLabel(/Velocidad didáctica/).selectOption('instant');
}

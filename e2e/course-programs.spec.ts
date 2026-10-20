import { expect, test } from '@playwright/test';
import { chooseMission, open, transport } from './helpers';

test.describe('programas del curso de punta a punta', () => {
  test('misión 10: ensamblar, ejecutar y leer «Hola mundo» en la Pantalla', async ({ page }) => {
    await open(page, '/8086');
    await chooseMission(page, 10);
    await page.getByRole('button', { name: 'Ensamblar y reiniciar' }).click();
    await transport(page).run.click();
    await expect(transport(page).status).toContainText('FINALIZADO', { timeout: 30_000 });
    await expect(page.locator('app-screen-panel .display')).toHaveAttribute('aria-label', /Hola mundo/);
    await expect(page.locator('.success')).toBeVisible();
  });

  test('misión 11 con teclado real: escribir 3 y 4 y ver 34=7', async ({ page }) => {
    await open(page, '/8086');
    await chooseMission(page, 11);
    await transport(page).run.click();
    await expect(transport(page).status).toContainText('ESPERANDO', { timeout: 30_000 });
    await expect(page.locator('#capture')).toBeFocused();
    await page.keyboard.type('3');
    await transport(page).run.click();
    await expect(transport(page).status).toContainText('ESPERANDO', { timeout: 30_000 });
    await page.keyboard.type('4');
    await transport(page).run.click();
    await expect(transport(page).status).toContainText('FINALIZADO', { timeout: 30_000 });
    await expect(page.locator('app-screen-panel .display')).toHaveAttribute('aria-label', /34=7/);
  });

  test('un error de ensamblado marca la línea y no ejecuta nada', async ({ page }) => {
    await open(page, '/8086');
    await page.locator('#program').fill('MOV AX, 1\nMOVSB\nHLT');
    await page.getByRole('button', { name: 'Ensamblar y reiniciar' }).click();
    await expect(page.locator('.error-line')).toContainText('Línea 2');
    await expect(page.locator('.error-line')).toContainText('fuera del subconjunto de SILICIO');
  });
});

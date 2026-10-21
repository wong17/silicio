import { expect, test } from '@playwright/test';
import { chooseMission, instant, open, transport } from './helpers';

test.describe('recorridos integrados', () => {
  test('programa a memoria a pieza a programa conserva el paso y los datos', async ({ page }) => {
    await open(page, '/8086');
    await transport(page).step.click();
    await expect(transport(page).status).toContainText('paso 1');
    await page.getByRole('link', { name: 'Memoria' }).click();
    await expect(page).toHaveURL(/\/memory/);
    await expect(page.getByRole('button', { name: /Consultando · volver al paso/ })).toBeVisible();
    await expect(transport(page).status).toContainText('paso 1');
    await page.getByRole('link', { name: 'Banco 8086' }).click();
    await expect(page.locator('app-register-panel')).toContainText('000C');
    await expect(transport(page).status).toContainText('paso 1');
  });

  test('PC: del SSD a la RAM y al monitor, luego la comparación en el SoC', async ({ page }) => {
    await open(page, '/machine');
    await page.locator('#pc-exercise').selectOption('suma-archivo');
    await page.getByRole('button', { name: 'Encender y arrancar' }).click();
    await instant(page);
    await transport(page).run.click();
    await expect(transport(page).status).toContainText('FINALIZADO', { timeout: 60_000 });
    await expect(page.locator('app-pc-components .screen')).toHaveText(/10/);
    await page.locator('#pc-exercise').selectOption('imagen-inversa');
    await page.getByRole('button', { name: 'Encender y arrancar' }).click();
    await instant(page);
    await transport(page).run.click();
    await expect(transport(page).status).toContainText('FINALIZADO', { timeout: 60_000 });
    await page.getByRole('button', { name: 'Comparar este resultado en el SoC' }).click();
    await expect(page).toHaveURL(/\/soc/);
    await page.getByRole('button', { name: 'Recibir el mosaico del PC' }).click();
    await expect(page.locator('app-apple-panel')).toContainText('Mosaico recibido del PC');
  });

  test('las direcciones antiguas siguen funcionando', async ({ page }) => {
    await open(page, '/apple');
    await expect(page).toHaveURL(/\/soc/);
    await open(page, '/time');
    await expect(page).toHaveURL(/\/8086/);
  });

  test('una guía por acciones avanza con el estado real y se puede cancelar con Esc', async ({ page }) => {
    await open(page, '/8086');
    await chooseMission(page, 1);
    await page.getByRole('button', { name: 'Ayuda' }).click();
    await page.getByRole('row', { name: /Tu primera instrucción/ }).getByRole('button', { name: 'Empezar' }).click();
    await expect(page.locator('.driver-popover')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.driver-popover-title')).toHaveText('El programa');
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await expect(page.locator('.driver-popover-title')).toHaveText('Un paso');
    await transport(page).step.click();
    await expect(page.locator('.driver-popover-title')).toHaveText('Por dentro');
    await page.keyboard.press('Escape');
    await expect(page.locator('.driver-popover')).toHaveCount(0);
  });

  test('sesión v3: exportar e importar devuelve el mismo estado', async ({ page }) => {
    await open(page, '/8086');
    await transport(page).step.click();
    const exported = await page.evaluate(() => (window as unknown as { __lab?: unknown }).__lab ?? null);
    expect(exported).toBeNull();
    await page.getByRole('button', { name: 'Ayuda' }).click();
    await expect(page.getByRole('tab', { name: /Sesión/ })).toBeVisible();
  });
});

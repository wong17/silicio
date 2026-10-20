import { defineConfig } from '@playwright/test';

/**
 * QA de integración: el sitio de producción (`npm run build`) servido por tools/serve-production.mjs, sin red
 * ni semillas variables. Con GPU de software sirve para funcionalidad y maquetación; no acredita rendimiento.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4300',
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
    locale: 'es-ES',
    reducedMotion: 'reduce',
    trace: 'off',
  },
  webServer: {
    command: 'node tools/serve-production.mjs',
    url: 'http://127.0.0.1:4300',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});

import { defineConfig } from '@playwright/test';
import base from '../../playwright.config';

/**
 * Capturas de documentación: la misma app de demostración que los E2E (backend en memoria y login
 * simulado, nunca Firebase), pero solo con el spec de capturas y de uno en uno.
 */
export default defineConfig({
  ...base,
  testDir: '.',
  testMatch: /capturas\.spec\.ts/,
  outputDir: '../../e2e/.results/capturas',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'line',
  projects: [{ name: 'capturas' }],
  // Sin animaciones (cifras que cuentan, entradas, gráficas que crecen): cada captura es el estado
  // final, igual en cada ejecución
  use: { ...base.use, reducedMotion: 'reduce' },
  // El servidor de la app se arranca desde la raíz del repo
  webServer:
    base.webServer && !Array.isArray(base.webServer)
      ? { ...base.webServer, cwd: '../..' }
      : base.webServer,
});

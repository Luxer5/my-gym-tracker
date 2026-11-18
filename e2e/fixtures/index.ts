import { expect, test as base, type Locator, type Page } from '@playwright/test';

/** Instante congelado: 7 oct 2026, 10:00 en Madrid. Todas las fechas «hoy» de la app salen de aquí */
export const NOW = '2026-10-07T08:00:00Z';
export const TODAY_DMY = '07/10/2026';

interface Fixtures {
  /** Página sin sesión (reloj fijado y control de errores del navegador) */
  anon: Page;
  /** Página con la sesión de demo iniciada, en la pantalla Gym */
  app: Page;
}

export const test = base.extend<Fixtures>({
  anon: async ({ page }, use) => {
    // Reloj congelado en el instante pero que avanza (los temporizadores de la app siguen funcionando)
    await page.clock.install({ time: new Date(NOW) });
    // Cualquier excepción no controlada o console.error de la app hace fallar la prueba
    const problems: string[] = [];
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') problems.push(`console.error: ${m.text()}`);
    });
    await use(page);
    expect(problems, 'errores en el navegador').toEqual([]);
  },
  app: async ({ anon }, use) => {
    await anon.goto('/');
    await anon.getByRole('button', { name: 'Continuar con Google' }).click();
    await expect(anon.locator('#screen-app')).toBeVisible();
    await expect(anon.locator('#exercise-grid')).toBeVisible();
    await use(anon);
  },
});

export { expect };

/** Navega pulsando la pestaña */
export async function goTab(page: Page, name: string | RegExp): Promise<void> {
  await page.getByRole('navigation', { name: 'Secciones' }).getByRole('link', { name }).click();
}

/** Tarjeta de un ejercicio por su nombre */
export const exerciseCard = (page: Page, name: string): Locator =>
  page
    .locator('app-exercise-card')
    .filter({ has: page.getByRole('heading', { name, exact: true }) });

/** Tarjeta Hyrox por estación */
export const hyroxCard = (page: Page, station: string): Locator =>
  page
    .locator('app-hyrox-card')
    .filter({ has: page.locator('.hx-station', { hasText: `Hyrox · ${station}` }) });

/** Responde al diálogo de confirmación de la app */
export async function confirmDialog(page: Page, button: string): Promise<void> {
  const dlg = page.getByRole('alertdialog');
  await expect(dlg).toBeVisible();
  await dlg.getByRole('button', { name: button }).click();
  await expect(dlg).toBeHidden();
}

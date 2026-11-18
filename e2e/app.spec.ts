import { expect, goTab, test } from './fixtures';

test.describe('Sesión y navegación', () => {
  test('entrar, navegar, recargar y salir', async ({ app: page }) => {
    await expect(page.locator('.user-name')).toHaveText('Atleta Demo');
    await goTab(page, /Hyrox/);
    await expect(page).toHaveURL(/\/hyrox$/);
    await expect(page).toHaveTitle('Hyrox · GYM LOG');

    // La sesión de demo sobrevive a la recarga y se queda en la misma pantalla
    await page.reload();
    await expect(page.locator('#hyrox-grid')).toBeVisible();

    await page.getByRole('button', { name: 'Salir' }).click();
    await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
  });

  test('una ruta desconocida lleva a Gym', async ({ anon: page }) => {
    await page.goto('/no-existe');
    await page.getByRole('button', { name: 'Continuar con Google' }).click();
    await expect(page).toHaveURL(/\/gym$/);
  });
});

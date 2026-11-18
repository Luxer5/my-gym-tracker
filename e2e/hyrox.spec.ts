import { confirmDialog, expect, goTab, hyroxCard, test } from './fixtures';

test.describe('Hyrox', () => {
  test.beforeEach(async ({ app: page }) => {
    await goTab(page, /Hyrox/);
    await expect(page).toHaveURL(/\/hyrox$/);
  });

  test('mejor marca, mejora e historial', async ({ app: page }) => {
    await expect(page.locator('#hyrox-summary .summary-val')).toHaveText(['4', '3', '3']);
    const ski = hyroxCard(page, 'SkiErg');
    await expect(ski.locator('.time-display')).toContainText('03:48');
    await expect(ski.locator('.card-date')).toHaveText('↓ Mejora: 00:13 · 2 tests');

    // El apóstrofo de la estación rompía el botón del historial
    const farmer = hyroxCard(page, "Farmer's Carry");
    await farmer.getByRole('button', { name: /Historial/ }).click();
    await expect(farmer.locator('.history-entry')).toHaveCount(1);
  });

  test('un test más rápido pasa a ser la mejor marca', async ({ app: page }) => {
    await page.getByRole('button', { name: '+ Nuevo test' }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('Estación').selectOption('SkiErg');
    await dlg.getByLabel('Distancia (m)').selectOption('1000');
    await dlg.getByLabel('Minutos').fill('3');
    await dlg.getByLabel('Segundos').fill('30');
    await dlg.getByRole('button', { name: 'Guardar test' }).click();
    await expect(dlg).toBeHidden();

    const ski = hyroxCard(page, 'SkiErg');
    await expect(ski.locator('.time-display')).toContainText('03:30');
    await expect(ski.locator('.card-date')).toHaveText('↓ Mejora: 00:31 · 3 tests');

    await ski.getByRole('button', { name: /Historial/ }).click();
    await ski
      .getByRole('button', { name: /Eliminar test/ })
      .first()
      .click();
    await confirmDialog(page, 'Eliminar');
    await expect(ski.locator('.time-display')).toContainText('03:48');
  });

  test('peso a mano y estación con nombre libre', async ({ app: page }) => {
    await page.getByRole('button', { name: '+ Nuevo test' }).click();
    let dlg = page.getByRole('dialog');
    await dlg.getByLabel('Estación').selectOption('Sled Pull');
    await dlg.getByLabel('Peso (kg)').selectOption('otro');
    await dlg.getByLabel('Peso en kg').fill('90');
    await dlg.getByLabel('Minutos').fill('2');
    await dlg.getByRole('button', { name: 'Guardar test' }).click();
    await expect(hyroxCard(page, 'Sled Pull').locator('.hx-meta')).toContainText('90 kg');

    await page.getByRole('button', { name: '+ Nuevo test' }).click();
    dlg = page.getByRole('dialog');
    await dlg.getByLabel('Estación').selectOption('Otro');
    await expect(dlg.getByLabel('Distancia (m)')).toHaveCount(0);
    await dlg.getByLabel('Nombre personalizado').fill('Circuito A');
    await dlg.getByLabel('Segundos').fill('75');
    await dlg.getByRole('button', { name: 'Guardar test' }).click();
    await expect(page.locator('.toast--error')).toHaveText('Los segundos van de 0 a 59.');
    await dlg.getByLabel('Segundos').fill('45');
    await dlg.getByRole('button', { name: 'Guardar test' }).click();
    await expect(hyroxCard(page, 'Circuito A').locator('.time-display')).toContainText('00:45');
  });
});

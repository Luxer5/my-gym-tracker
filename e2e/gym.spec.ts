import { TODAY_DMY, confirmDialog, exerciseCard, expect, test } from './fixtures';

test.describe('Gym', () => {
  test('resumen y tarjetas de los datos de demo', async ({ app: page }) => {
    await expect(page).toHaveTitle('Gym · GYM LOG');
    await expect(page.locator('#gym-summary .summary-val')).toHaveText(['3', '2', '3']);
    await expect(page.locator('app-exercise-card')).toHaveCount(3);
    const squat = exerciseCard(page, 'Sentadilla');
    await expect(squat.locator('.rm-box.is-pr .rm-val')).toHaveText('140kg');
  });

  test('alta de ejercicio, registro, historial y borrado', async ({ app: page }) => {
    await page.getByRole('button', { name: '+ Nuevo ejercicio' }).click();
    const dlg = page.getByRole('dialog');
    await expect(dlg.getByLabel('Nombre')).toBeFocused();
    await dlg.getByLabel('Nombre').fill('Peso muerto');
    await dlg.getByLabel('Categoría').selectOption('Piernas');
    await dlg.getByRole('button', { name: 'Guardar ejercicio' }).click();
    await expect(dlg).toBeHidden();
    await expect(page.locator('.toast--success')).toContainText('«Peso muerto» añadido');

    const card = exerciseCard(page, 'Peso muerto');
    await card.getByRole('button', { name: '+ Registro' }).click();
    const rec = page.getByRole('dialog');
    await rec.getByRole('button', { name: /3RM/ }).click();
    await rec.getByLabel('Peso (kg)').fill('160');
    await rec.getByLabel('Nota (opcional)').fill('con straps');
    await rec.getByRole('button', { name: 'Guardar registro' }).click();
    await expect(rec).toBeHidden();

    await expect(card.locator('.rm-box').nth(2).locator('.rm-val')).toHaveText('160kg');
    await expect(card.locator('.card-date')).toHaveText(`Último registro: ${TODAY_DMY}`);
    await expect(page.locator('#gym-summary .summary-val')).toHaveText(['4', '2', '4']);

    await card.getByRole('button', { name: /Historial \(1\)/ }).click();
    await expect(card.locator('.history-entry')).toContainText('con straps');
    await card.getByRole('button', { name: /Eliminar registro 3RM/ }).click();
    await confirmDialog(page, 'Eliminar');
    await expect(card.locator('.rm-box').nth(2).locator('.rm-val')).toHaveText('—');

    await card.getByRole('button', { name: 'Eliminar Peso muerto' }).click();
    await confirmDialog(page, 'Eliminar');
    await expect(card).toHaveCount(0);
  });

  test('los datos que faltan se avisan sin cerrar la ventana', async ({ app: page }) => {
    await page.getByRole('button', { name: '+ Nuevo ejercicio' }).click();
    await page.getByRole('button', { name: 'Guardar ejercicio' }).click();
    await expect(page.locator('.toast--error')).toHaveText('Escribe el nombre del ejercicio.');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('filtro por categoría', async ({ app: page }) => {
    await page.getByRole('button', { name: 'Empuje', exact: true }).click();
    await expect(page.locator('app-exercise-card')).toHaveCount(1);
    await expect(exerciseCard(page, 'Press banca')).toBeVisible();
    await page.getByRole('button', { name: 'Todos' }).click();
    await expect(page.locator('app-exercise-card')).toHaveCount(3);
  });
});

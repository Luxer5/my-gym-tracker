import { PASTE_DESKTOP, PASTE_MOBILE } from '../src/testing/race-paste';
import { confirmDialog, expect, goTab, test } from './fixtures';

test.describe('Carreras', () => {
  test.beforeEach(async ({ app: page }) => {
    await goTab(page, /Carreras/);
    await expect(page).toHaveURL(/\/carreras$/);
  });

  test('listado con resumen, evolución y tarjetas', async ({ app: page }) => {
    await expect(page.locator('#races-summary .summary-val')).toHaveText(['2', '1:21:15', '6:05']);
    await expect(page.locator('#races-evolution canvas')).toBeVisible();
    await expect(page.locator('.race-card')).toHaveCount(2);
    await expect(page.locator('.race-card').first()).toContainText('HYROX Madrid');
    await expect(page.locator('.race-card').first().locator('.pb-badge')).toBeVisible();
  });

  test('importar pegando el resultado oficial y ver la ficha', async ({ app: page }) => {
    await page.getByRole('link', { name: '+ Importar carrera' }).click();
    await expect(page).toHaveURL(/\/carreras\/importar$/);
    await expect(page.getByRole('link', { name: /results\.hyrox\.com/ })).toHaveAttribute(
      'target',
      '_blank',
    );

    await page.getByLabel('Resultado copiado').fill(PASTE_DESKTOP);
    await expect(page.locator('#parse-status')).toContainText('16 de 16 tramos');
    await expect(page.getByLabel('Carrera', { exact: true })).toHaveValue('HYROX Barcelona');
    await expect(page.getByLabel('Running 8')).toHaveValue('04:56');
    await expect(page.getByLabel('Tiempo oficial')).toHaveValue('1:19:25');

    // Una corrección antes de guardar
    await page.getByLabel('Nota (opcional)').fill('Calor en la nave');
    await page.getByRole('button', { name: 'Guardar carrera' }).click();

    await expect(page).toHaveURL(/\/carreras\/m\d+$/);
    await expect(page).toHaveTitle('Carrera · GYM LOG');
    await expect(page.locator('#race-total')).toHaveText('1:19:25');
    await expect(page.locator('.hero-delta')).toContainText('más rápido que HYROX Madrid');
    await expect(page.locator('#race-kpis')).toContainText('#512');
    await expect(page.locator('#race-splits canvas')).toBeVisible();
    await expect(page.locator('#race-laps canvas')).toBeVisible();
    await expect(page.locator('#race-insights li')).toHaveCount(5);
    await expect(page.locator('.race-note')).toHaveText('«Calor en la nave»');

    await page.getByText('Ver la tabla').first().click();
    await expect(page.locator('#race-splits-table')).toContainText('Wall Balls');

    await page.getByRole('link', { name: '← Carreras' }).click();
    await expect(page.locator('.race-card')).toHaveCount(3);
    await expect(page.locator('.race-card').first()).toContainText('HYROX Barcelona');
  });

  test('copia desde el móvil, con un tramo que falta', async ({ app: page }) => {
    await page.getByRole('link', { name: '+ Importar carrera' }).click();
    await page.getByLabel('Resultado copiado').fill(PASTE_MOBILE.replace('Sled Pull\n03:56', ''));
    await expect(page.locator('#parse-status')).toContainText('Falta: Sled Pull');
    await page.getByRole('button', { name: 'Guardar carrera' }).click();
    await expect(page.locator('.toast--error')).toHaveText('Revisa el tiempo de Sled Pull.');
    await page.getByLabel('Sled Pull').fill('3:56');
    await page.getByRole('button', { name: 'Guardar carrera' }).click();
    await expect(page.locator('#race-total')).toHaveText('1:19:25');
  });

  test('comparar con otra carrera y eliminar', async ({ app: page }) => {
    await page.locator('.race-card', { hasText: 'HYROX Madrid' }).click();
    await expect(page.locator('#race-compare canvas')).toBeVisible();
    await page.locator('#race-compare').getByText('Ver la tabla').click();
    await expect(page.locator('#race-compare-table .row-total')).toContainText('−6:05');

    await page.getByRole('button', { name: 'Eliminar' }).click();
    await confirmDialog(page, 'Eliminar');
    await expect(page).toHaveURL(/\/carreras$/);
    await expect(page.locator('.race-card')).toHaveCount(1);
  });
});

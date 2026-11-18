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

  test('marcador: desde la ficha oficial abre GYM LOG con la carrera rellenada', async ({
    app: page,
    context,
  }) => {
    await page.getByRole('link', { name: '+ Importar carrera' }).click();
    const href = (await page.locator('#bookmarklet').getAttribute('href'))!;
    const script = decodeURIComponent(href.slice('javascript:'.length));

    // Ficha oficial simulada: la petición se responde aquí y no sale a internet
    const official = await context.newPage();
    await official.route('https://results.hyrox.com/**', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: `<title>HYROX - For Every Body: Atleta Demo</title><pre>${PASTE_DESKTOP}</pre>`,
      }),
    );
    await official.goto('https://results.hyrox.com/season-8/ficha');
    const [app] = await Promise.all([context.waitForEvent('page'), official.evaluate(script)]);

    // Pestaña nueva: primero el acceso, luego la importación
    await app.getByRole('button', { name: 'Continuar con Google' }).click();
    await expect(app.locator('#parse-status')).toContainText('Leído de tu ficha oficial');
    await expect(app.locator('#parse-status')).toContainText('16 de 16 tramos');
    await expect(app.getByLabel('Carrera', { exact: true })).toHaveValue('HYROX Barcelona');
    await expect(app.getByLabel('Atleta')).toHaveValue('Atleta Demo');
    await expect(app).toHaveURL(/\/carreras\/importar$/);
    await app.getByRole('button', { name: 'Guardar carrera' }).click();
    await expect(app.locator('#race-total')).toHaveText('1:19:25');
  });

  test('estimador: parte de la última carrera y los deslizadores cambian el tiempo', async ({
    app: page,
  }) => {
    await page.getByRole('link', { name: 'Estimador' }).click();
    await expect(page).toHaveURL(/\/carreras\/estimador$/);
    await expect(page.locator('#est-total')).toHaveText('1:21:15');
    await page.locator('#est-run').fill('288');
    await expect(page.locator('#est-total')).toHaveText('1:20:46');
    await expect(page.locator('#est-run-total')).toContainText('38:24');
    await page.locator('#est-rox').fill('300');
    await expect(page.locator('#est-delta')).toHaveText('2:07 más rápido que HYROX Madrid');
    await page.getByRole('button', { name: 'Restablecer' }).click();
    await expect(page.locator('#est-total')).toHaveText('1:21:15');

    // Desde la ficha de otra carrera, esa es la de partida
    await page.getByRole('link', { name: '← Carreras' }).click();
    await page.locator('.race-card', { hasText: 'HYROX Valencia' }).click();
    await page.getByRole('link', { name: 'Estimar desde aquí' }).click();
    await expect(page.locator('#est-total')).toHaveText('1:27:20');
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

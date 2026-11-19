import { type Page } from '@playwright/test';
import path from 'node:path';
import { exerciseCard, expect, goTab, hyroxCard, test } from '../../e2e/fixtures';
import { PASTE_DESKTOP } from '../../src/testing/race-paste';

/**
 * Capturas del README (docs/screenshots/*.png) con la app de demostración: backend en memoria,
 * login simulado y datos ficticios. La demo trae pocos datos, así que antes se dan de alta desde la
 * interfaz más ejercicios, registros y tests Hyrox (también ficticios).
 *
 * npm run capturas     (= npx playwright test --config docs/capturas/playwright.capturas.config.ts)
 */
const OUT = path.resolve(__dirname, '..', 'screenshots');

const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };
const MOBILE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
};

/** Usuario de la demo: si en pantalla aparece otro, la captura no se hace */
const DEMO_USER = 'Atleta Demo';

// ── Datos ficticios que se añaden a los de la demo ──

const EXERCISES: [name: string, category: string][] = [
  ['Peso muerto', 'Full body'],
  ['Press militar', 'Hombros'],
  ['Hip thrust', 'Piernas'],
  ['Remo con barra', 'Jalón'],
];

// [ejercicio, tipo, peso, fecha, nota]
const RECORDS: [string, string, string, string, string?][] = [
  ['Sentadilla', '3RM', '125', '2026-09-10'],
  ['Sentadilla', '1RM', '137.5', '2026-08-30', 'competición interna'],
  ['Press banca', 'PR', '100', '2026-09-27', 'con spotter'],
  ['Press banca', '5RM', '80', '2026-09-03'],
  ['Dominadas lastradas', '1RM', '32.5', '2026-09-22'],
  ['Dominadas lastradas', '5RM', '20', '2026-09-08'],
  ['Peso muerto', 'PR', '170', '2026-09-28', 'agarre mixto'],
  ['Peso muerto', '3RM', '150', '2026-09-12'],
  ['Peso muerto', '5RM', '140', '2026-08-20'],
  ['Peso muerto', 'PR', '160', '2026-07-05'],
  ['Press militar', '1RM', '62.5', '2026-09-25'],
  ['Press militar', '5RM', '52.5', '2026-09-04'],
  ['Hip thrust', '3RM', '175', '2026-09-16'],
  ['Hip thrust', '5RM', '160', '2026-09-30', 'con banda'],
  ['Remo con barra', '5RM', '85', '2026-09-18'],
];

interface HyroxEntry {
  station: string;
  /** Valor del desplegable de distancia/peso, u «otro» con `custom` */
  preset?: string;
  custom?: string;
  min: string;
  sec: string;
  date: string;
  note?: string;
}

const HYROX: HyroxEntry[] = [
  { station: 'SkiErg', preset: '1000', min: '3', sec: '41', date: '2026-10-04' },
  { station: 'RowErg', preset: '1000', min: '3', sec: '52', date: '2026-08-10' },
  {
    station: 'RowErg',
    preset: '1000',
    min: '3',
    sec: '41',
    date: '2026-09-21',
    note: 'ritmo 1:50',
  },
  { station: 'Running', preset: '1000', min: '3', sec: '58', date: '2026-08-05' },
  { station: 'Running', preset: '1000', min: '3', sec: '49', date: '2026-09-30' },
  { station: 'Sled Push', preset: '102', min: '1', sec: '12', date: '2026-09-12' },
  { station: 'Sandbag Lunges', preset: '20', min: '3', sec: '20', date: '2026-09-19' },
  { station: 'Burpee Broad Jump', min: '4', sec: '5', date: '2026-09-26', note: '80 m' },
  { station: 'Wall Balls', preset: '6', min: '4', sec: '58', date: '2026-10-02' },
];

async function addExercise(page: Page, name: string, category: string): Promise<void> {
  await page.getByRole('button', { name: '+ Nuevo ejercicio' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('Nombre').fill(name);
  await dlg.getByLabel('Categoría').selectOption(category);
  await dlg.getByRole('button', { name: 'Guardar ejercicio' }).click();
  await expect(dlg).toBeHidden();
}

async function fillRecord(page: Page, type: string, value: string, date: string, note = '') {
  const dlg = page.getByRole('dialog');
  await dlg.getByRole('button', { name: new RegExp(`^${type}`) }).click();
  await dlg.getByLabel(/^Peso/).fill(value);
  await dlg.getByLabel('Fecha').fill(date);
  await dlg.getByLabel('Nota (opcional)').fill(note);
}

async function addRecord(
  page: Page,
  exercise: string,
  ...[type, value, date, note]: [string, string, string, string?]
): Promise<void> {
  await exerciseCard(page, exercise).getByRole('button', { name: '+ Registro' }).click();
  await fillRecord(page, type, value, date, note);
  const dlg = page.getByRole('dialog');
  await dlg.getByRole('button', { name: 'Guardar registro' }).click();
  await expect(dlg).toBeHidden();
}

async function fillHyrox(page: Page, t: HyroxEntry): Promise<void> {
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('Estación').selectOption(t.station);
  if (t.preset) await dlg.locator('#hx-preset').selectOption(t.preset);
  if (t.custom) await dlg.locator('#hx-custom').fill(t.custom);
  await dlg.getByLabel('Minutos').fill(t.min);
  await dlg.getByLabel('Segundos').fill(t.sec);
  await dlg.getByLabel('Fecha').fill(t.date);
  await dlg.getByLabel('Nota (opcional)').fill(t.note ?? '');
}

async function addHyrox(page: Page, t: HyroxEntry): Promise<void> {
  await page.getByRole('button', { name: '+ Nuevo test' }).click();
  await fillHyrox(page, t);
  const dlg = page.getByRole('dialog');
  await dlg.getByRole('button', { name: 'Guardar test' }).click();
  await expect(dlg).toBeHidden();
}

/** Da de alta los datos ficticios de las capturas (empieza y termina en Gym) */
async function seed(page: Page): Promise<void> {
  for (const [name, category] of EXERCISES) await addExercise(page, name, category);
  for (const [exercise, ...rec] of RECORDS) await addRecord(page, exercise, ...rec);
  await expect(page.locator('app-exercise-card')).toHaveCount(3 + EXERCISES.length);

  await goTab(page, /Hyrox/);
  for (const t of HYROX) await addHyrox(page, t);
  await expect(page.locator('#hyrox-summary .summary-val').first()).toHaveText(
    String(4 + HYROX.length),
  );
  await goTab(page, /Gym/);
}

type Shot = (name: string, opts?: { full?: boolean }) => Promise<void>;

function shooter(page: Page): Shot {
  return async (name, { full = false } = {}) => {
    // Sin los avisos de «… ✓» de los pasos anteriores ni el ratón encima de nada
    await page.addStyleTag({ content: '.toasts{visibility:hidden!important}' });
    await page.mouse.move(0, 0);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    // Solo la cuenta de la demo: nunca una captura con una sesión real
    const user = page.locator('.user-name');
    if (await user.count()) expect(await user.textContent()).toBe(DEMO_USER);
    const file = path.join(OUT, `${name}.png`);
    if (!full) {
      await page.screenshot({ path: file });
      return;
    }
    // Página completa: primero se agranda la ventana a toda la página y se deja que las gráficas se
    // vuelvan a dibujar (con fullPage, Playwright la agranda en el último momento y al cambiar el
    // ancho útil Chart.js borra el lienzo justo cuando se hace la captura)
    const size = page.viewportSize()!;
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: size.width, height });
    await page.waitForTimeout(900);
    await page.screenshot({ path: file });
    await page.setViewportSize(size);
  };
}

const top = (page: Page) => page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));

test.describe('README · escritorio', () => {
  test.use(DESKTOP);
  test.setTimeout(180_000);

  test('inicio de sesión', async ({ anon: page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
    await shooter(page)('login');
  });

  test('pantallas', async ({ app: page }) => {
    const shot = shooter(page);
    await seed(page);

    // Gym con el historial de un ejercicio abierto
    await exerciseCard(page, 'Sentadilla')
      .getByRole('button', { name: /Historial/ })
      .click();
    await top(page);
    await shot('gym', { full: true });

    // Filtro por categoría
    await page.getByRole('button', { name: 'Piernas', exact: true }).click();
    await shot('gym-filtro');
    await page.getByRole('button', { name: 'Todos' }).click();

    // Nuevo registro a medio rellenar
    await exerciseCard(page, 'Peso muerto').getByRole('button', { name: '+ Registro' }).click();
    await fillRecord(page, '1RM', '165', '2026-10-07', 'cinturón');
    await shot('gym-registro');
    await page.keyboard.press('Escape');

    // Hyrox con el historial de la estación con más tests
    await goTab(page, /Hyrox/);
    await hyroxCard(page, 'SkiErg')
      .getByRole('button', { name: /Historial/ })
      .click();
    await top(page);
    await shot('hyrox', { full: true });

    // Tests de carrera: zonas del VAM y del de Jim Vance (datos ficticios de la demo)
    await page
      .locator('#run-tests')
      .evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await shot('hyrox-carrera');

    // Nuevo test con peso a mano
    await page.getByRole('button', { name: '+ Nuevo test' }).click();
    await fillHyrox(page, {
      station: 'Sled Pull',
      preset: 'otro',
      custom: '90',
      min: '1',
      sec: '38',
      date: '2026-10-07',
      note: 'moqueta lenta',
    });
    await shot('hyrox-test');
    await page.keyboard.press('Escape');

    // Confirmación antes de borrar
    await hyroxCard(page, 'SkiErg')
      .getByRole('button', { name: /Eliminar test/ })
      .first()
      .click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await shot('confirmar');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancelar' }).click();

    // Carreras: importar pegando el resultado oficial (texto de ejemplo ficticio)
    await goTab(page, /Carreras/);
    await page.getByRole('link', { name: '+ Importar carrera' }).click();
    await page.getByLabel('Resultado copiado').fill(PASTE_DESKTOP);
    await expect(page.locator('#parse-status')).toContainText('16 de 16 tramos');
    await page.getByLabel('Nota (opcional)').fill('Mucho calor en la nave');
    await top(page);
    await shot('carreras-importar', { full: true });
    await page.getByRole('button', { name: 'Guardar carrera' }).click();
    await expect(page.locator('#race-total')).toHaveText('1:19:25');
    await page.waitForTimeout(900); // animación de entrada de las gráficas
    await top(page);
    await shot('carrera', { full: true });

    await page.getByRole('link', { name: '← Carreras' }).click();
    await expect(page.locator('.race-card')).toHaveCount(3);
    await page.waitForTimeout(900);
    await shot('carreras', { full: true });

    // Estimador: un par de ajustes sobre la última carrera
    await page.getByRole('link', { name: 'Estimador' }).click();
    await page.locator('#est-run').fill('279');
    await page.locator('#est-rox').fill('330');
    await page.locator('#est-st-7').fill('350');
    await top(page);
    await shot('estimador', { full: true });
  });
});

test.describe('README · móvil', () => {
  test.use(MOBILE);
  test.setTimeout(180_000);

  test('pantallas', async ({ app: page }) => {
    const shot = shooter(page);
    await seed(page);
    await top(page);
    await shot('movil-gym');

    await exerciseCard(page, 'Press banca').getByRole('button', { name: '+ Registro' }).click();
    await fillRecord(page, 'PR', '102.5', '2026-10-07');
    await shot('movil-registro');
    await page.keyboard.press('Escape');

    await goTab(page, /Hyrox/);
    await top(page);
    await shot('movil-hyrox');

    await goTab(page, /Carreras/);
    await page.waitForTimeout(900);
    await shot('movil-carreras');
    await page.locator('.race-card', { hasText: 'HYROX Madrid' }).click();
    await expect(page.locator('#race-total')).toHaveText('1:21:15');
    await page.waitForTimeout(900);
    await top(page);
    await shot('movil-carrera');
  });
});

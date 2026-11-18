import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import {
  AppCtx,
  clickButton,
  openRoute,
  rowText,
  settle,
  setupApp,
  teardownApp,
  textOf,
  type,
  until,
} from '../../../testing/feature-harness';
import { PASTE_DESKTOP, PASTE_MOBILE } from '../../../testing/race-paste';
import { encodeImportPayload } from '../../domain/race-bookmarklet';

describe('RaceImportComponent · marcador', () => {
  afterEach(teardownApp);

  it('arriving from the bookmarklet fills the form and cleans the address', async () => {
    const ctx = setupApp();
    const payload = encodeImportPayload(`HYROX - For Every Body: Atleta Demo\n${PASTE_DESKTOP}`);
    const { el } = await openRoute(ctx, `/carreras/importar#hyrox=${payload}`);
    await settle();
    expect(rowText(el.querySelector('#parse-status'))).toBe(
      'Leído de tu ficha oficial ✓ 16 de 16 tramos · Total 1:19:25 · Roxzone 06:25',
    );
    expect(el.querySelector<HTMLInputElement>('#race-event')!.value).toBe('HYROX Barcelona');
    expect(el.querySelector<HTMLTextAreaElement>('#race-paste')!.value).toContain('Running 1');
    expect(TestBed.inject(Router).url).toBe('/carreras/importar');
  });

  it('the install button is a javascript: bookmark that is dragged, not clicked here', async () => {
    const ctx = setupApp();
    const { el } = await openRoute(ctx, '/carreras/importar');
    const link = el.querySelector<HTMLAnchorElement>('#bookmarklet')!;
    expect(link.getAttribute('href')).toMatch(/^javascript:/);
    link.click();
    TestBed.tick();
    expect(ctx.notify.toasts().at(-1)?.msg).toContain('Arrastra el botón');
    expect(TestBed.inject(Router).url).toBe('/carreras/importar');
  });

  it('copies the bookmark code for mobile', async () => {
    const ctx = setupApp();
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const { el } = await openRoute(ctx, '/carreras/importar');
    clickButton(el, 'Copiar código del marcador');
    await settle();
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/^javascript:/));
    expect(ctx.notify.toasts().at(-1)?.msg).toBe('Código del marcador copiado ✓');
  });
});

describe('RaceImportComponent', () => {
  let ctx: AppCtx;
  let el: HTMLElement;
  beforeEach(async () => {
    ctx = setupApp();
    ({ el } = await openRoute(ctx, '/carreras/importar'));
  });
  afterEach(teardownApp);

  const input = (sel: string) => el.querySelector<HTMLInputElement>(sel)!;
  const runInput = (i: number) =>
    el.querySelectorAll<HTMLInputElement>('.split-field--run input')[i];
  const stationInput = (i: number) =>
    el.querySelectorAll<HTMLInputElement>('.split-field--station input')[i];

  it('links to the official results site in a new tab', () => {
    const a = el.querySelector<HTMLAnchorElement>('a[href="https://results.hyrox.com/"]')!;
    expect(a.target).toBe('_blank');
    expect(a.rel).toContain('noopener');
  });

  it('pasting the result fills the review form', () => {
    expect(el.querySelector('#race-form')).toBeNull();
    type(el, '#race-paste', PASTE_DESKTOP);
    expect(rowText(el.querySelector('#parse-status'))).toBe(
      '✓ 16 de 16 tramos · Total 1:19:25 · Roxzone 06:25',
    );
    expect(input('#race-event').value).toBe('HYROX Barcelona');
    expect(input('#race-date').value).toBe('2026-09-27');
    expect(input('#race-athlete').value).toBe('Atleta Demo');
    expect(runInput(0).value).toBe('04:18');
    expect(stationInput(7).value).toBe('06:29');
    expect(input('#race-total').value).toBe('1:19:25');
    expect(textOf(el.querySelector('#race-sum-hint'))).toBe(
      'Tramos: 1:13:00 · con Roxzone: 1:19:25',
    );
  });

  it('tells what is missing', () => {
    type(el, '#race-paste', PASTE_MOBILE.replace('Wall Balls\n06:29', ''));
    const status = el.querySelector('#parse-status')!;
    expect(status.classList).toContain('parse-status--warn');
    expect(textOf(status)).toContain('15 de 16 tramos');
    expect(textOf(status)).toContain('Falta: Wall Balls');
    expect(stationInput(7).value).toBe('');
  });

  it('text without splits explains what to copy and opens no form', () => {
    type(el, '#race-paste', 'hola');
    expect(textOf(el.querySelector('#parse-status'))).toContain(
      'No encuentro los tiempos por tramo',
    );
    expect(el.querySelector('#race-form')).toBeNull();
  });

  it('saves the reviewed race and opens its page', async () => {
    type(el, '#race-paste', PASTE_DESKTOP);
    type(el, '#race-note', 'Primera en Barcelona');
    el.querySelector<HTMLFormElement>('#race-form')!.requestSubmit();
    // Guardar y abrir la ficha (pantalla de carga diferida) puede llevar varias vueltas
    const router = TestBed.inject(Router);
    await until(() => router.url !== '/carreras/importar');
    const saved = ctx.store.races().find((r) => r.event === 'HYROX Barcelona')!;
    expect(saved).toMatchObject({ totalSec: 4765, note: 'Primera en Barcelona', rankAgeGroup: 88 });
    expect(router.url).toBe(`/carreras/${saved.id}`);
  });

  it('manual entry: empty form, corrections and validation', async () => {
    clickButton(el, 'o introduce la carrera a mano');
    expect(input('#race-event').value).toBe('');
    expect(input('#race-division').value).toBe('HYROX Men');
    el.querySelector<HTMLFormElement>('#race-form')!.requestSubmit();
    await settle();
    expect(ctx.alert).toHaveBeenCalledWith('Escribe el nombre de la carrera.');

    type(el, '#race-event', 'HYROX Sevilla');
    for (let i = 0; i < 8; i++) {
      runInput(i).value = '4:30';
      runInput(i).dispatchEvent(new Event('input'));
      stationInput(i).value = '4.00';
      stationInput(i).dispatchEvent(new Event('input'));
    }
    type(el, '#race-roxzone', '6:00');
    TestBed.tick();
    expect(textOf(el.querySelector('#race-sum-hint'))).toBe(
      'Tramos: 1:08:00 · con Roxzone: 1:14:00',
    );
    el.querySelector<HTMLFormElement>('#race-form')!.requestSubmit();
    await settle();
    expect(ctx.store.races().find((r) => r.event === 'HYROX Sevilla')?.totalSec).toBe(4440);
  });
});

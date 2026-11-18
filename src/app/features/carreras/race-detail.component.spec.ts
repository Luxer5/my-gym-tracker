import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  AppCtx,
  answerConfirm,
  clickButton,
  openRoute,
  rowText,
  settle,
  setupApp,
  teardownApp,
  textOf,
  type,
} from '../../../testing/feature-harness';

describe('RaceDetailComponent', () => {
  let ctx: AppCtx;
  let el: HTMLElement;
  let harness: RouterTestingHarness;
  beforeEach(async () => {
    ctx = setupApp();
    ({ el, harness } = await openRoute(ctx, '/carreras/c2'));
  });
  afterEach(teardownApp);

  const tiles = () =>
    [...el.querySelectorAll('#race-kpis .stat-tile')].map(
      (t) => `${textOf(t.querySelector('.stat-label'))}: ${textOf(t.querySelector('.stat-value'))}`,
    );

  it('header, official time and the comparison with the previous race', () => {
    expect(textOf(el.querySelector('.section-title'))).toBe(
      'HYROX Madrid 18/04/2026 · HYROX Men · 30-34 · Atleta Demo',
    );
    expect(textOf(el.querySelector('#race-total'))).toBe('1:21:15');
    expect(textOf(el.querySelector('.hero-delta'))).toBe('6:05 más rápido que HYROX Valencia');
    expect(el.ownerDocument.title).toBe('Carrera · GYM LOG');
  });

  it('KPI tiles', () => {
    expect(tiles()).toEqual([
      'Posición división: #604',
      'Grupo de edad: #101',
      'Running: 38:53',
      'Estaciones: 35:44',
      'Roxzone: 06:38',
      'Mejor vuelta: 04:22',
    ]);
    expect(textOf(el.querySelectorAll('#race-kpis .stat-sub')[1])).toBe('4:52 /km');
  });

  it('breakdown bar, charts and the splits table', () => {
    expect(textOf(el.querySelector('#race-breakdown .seg-legend'))).toBe(
      'Running38:5348 %Estaciones35:4444 %Roxzone06:388 %',
    );
    expect(el.querySelectorAll('canvas').length).toBeGreaterThanOrEqual(3);
    const rows = [...el.querySelectorAll('#race-splits-table tbody tr')].map((r) => rowText(r));
    expect(rows).toHaveLength(18);
    expect(rows[0]).toBe('Running 1 04:22');
    expect(rows[1]).toBe('SkiErg 04:22');
    expect(rows.at(-1)).toBe('Total 1:21:15');
  });

  it('insights', () => {
    const items = [...el.querySelectorAll('#race-insights li')].map((li) => textOf(li));
    expect(items[0]).toBe('Corriste 38:53 (48 % del total) a una media de 4:52 /km.');
    expect(items).toHaveLength(5);
  });

  it('race versus training: the SkiErg 1000 m test of the Hyrox tab', () => {
    const row = rowText(el.querySelector('#race-training tbody tr'));
    expect(row).toBe('SkiErg 1000 m 04:22 03:48 25/09/2026 +0:34');
  });

  it('comparison table and choosing another race', async () => {
    const total = () => rowText(el.querySelector('#race-compare-table .row-total'));
    expect(total()).toBe('Total 1:21:15 1:27:20 −6:05');
    // Una tercera carrera para poder elegir
    await ctx.repo.addRace({
      ...ctx.store.race('c1')!,
      event: 'HYROX Bilbao',
      date: '2026-06-01',
      totalSec: 4700,
      createdAt: '2026-06-02T00:00:00.000Z',
    });
    await settle();
    const bilbao = ctx.store.races().find((r) => r.event === 'HYROX Bilbao')!;
    type(el, '#compare-with', bilbao.id);
    await settle();
    expect(total()).toBe('Total 1:21:15 1:18:20 +2:55');
    expect(textOf(el.querySelector('.hero-delta'))).toBe('2:55 más lento que HYROX Bilbao');
    expect(el.querySelector('.hero-delta')?.classList).toContain('hero-delta--bad');
  });

  it('deleting asks first and goes back to the list', async () => {
    clickButton(el, 'Eliminar');
    await answerConfirm(ctx.confirm, true);
    await settle();
    expect(ctx.store.race('c2')).toBeUndefined();
    expect(TestBed.inject(Router).url).toBe('/carreras');
  });

  it('unknown race', async () => {
    await harness.navigateByUrl('/carreras/nope');
    await settle();
    const other = harness.routeNativeElement as HTMLElement;
    expect(textOf(other.querySelector('.empty-state'))).toContain('No encuentro esta carrera');
  });
});

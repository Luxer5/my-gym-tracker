import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
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
} from '../../../testing/feature-harness';

describe('EstimatorComponent', () => {
  let ctx: AppCtx;
  let el: HTMLElement;
  let harness: RouterTestingHarness;
  beforeEach(async () => {
    ctx = setupApp();
    ({ el, harness } = await openRoute(ctx, '/carreras/estimador'));
  });
  afterEach(teardownApp);

  const total = () => textOf(el.querySelector('#est-total'));
  /** Running total y su diferencia, debajo del deslizador de ritmo */
  const runTotal = () =>
    ['strong', '.slider-delta'].map((q) => textOf(el.querySelector(`#est-run-total ${q}`)));
  const slide = (selector: string, value: number) => {
    const input = el.querySelector<HTMLInputElement>(selector)!;
    input.value = String(value);
    input.dispatchEvent(new Event('input'));
    TestBed.tick();
  };

  it('starts from the latest race and shows its official time', () => {
    expect(el.querySelector<HTMLSelectElement>('#est-base')!.value).toBe('c2');
    expect(total()).toBe('1:21:15');
    expect(textOf(el.querySelector('#est-delta'))).toBe('Igual que HYROX Madrid');
    // El deslizador de running es el ritmo medio por km: 2333 s / 8 ≈ 292 s (4:52 /km)
    expect(el.querySelector<HTMLInputElement>('#est-run')!.value).toBe('292');
    expect(runTotal()).toEqual(['38:53', '±0:00']);
    expect(el.querySelectorAll('.est-station input')).toHaveLength(8);
    expect(el.ownerDocument.title).toBe('Estimador de tiempo · GYM LOG');
  });

  it('the sliders change the estimated time', () => {
    slide('#est-run', 288); // 4:48 /km → 8 × 288 = 2304 s de running
    expect(total()).toBe('1:20:46');
    expect(runTotal()).toEqual(['38:24', '−0:29']);
    slide('#est-rox', 300);
    slide('#est-st-7', 360);
    // 4875 − 29 (running) − 98 (Roxzone) − 41 (Wall Balls) = 4707
    expect(total()).toBe('1:18:27');
    const delta = el.querySelector('#est-delta')!;
    expect(textOf(delta)).toBe('2:48 más rápido que HYROX Madrid');
    expect(delta.classList).toContain('hero-delta--good');
    const rows = [...el.querySelectorAll('#est-table tbody tr')].map((r) => rowText(r));
    expect(rows.at(-1)).toBe('Roxzone 06:38 05:00 −1:38');
  });

  it('reset goes back to the race values', () => {
    slide('#est-rox', 600);
    expect(textOf(el.querySelector('#est-delta'))).toContain('más lento');
    clickButton(el, 'Restablecer');
    expect(total()).toBe('1:21:15');
  });

  it('another base race: from the selector or the ?base= link', async () => {
    type(el, '#est-base', 'c1');
    expect(total()).toBe('1:27:20');
    await harness.navigateByUrl('/carreras/estimador?base=c1');
    await settle();
    el = harness.routeNativeElement as HTMLElement;
    expect(el.querySelector<HTMLSelectElement>('#est-base')!.value).toBe('c1');
  });

  it('without races it invites to import one', async () => {
    await ctx.repo.deleteRace('c1');
    await ctx.repo.deleteRace('c2');
    await settle();
    expect(textOf(el.querySelector('.empty-state'))).toContain('Importa una carrera');
    expect(el.querySelector('a[href="/carreras/importar"]')).not.toBeNull();
  });
});

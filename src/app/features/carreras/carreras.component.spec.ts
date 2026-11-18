import {
  AppCtx,
  openRoute,
  settle,
  setupApp,
  summaryOf,
  teardownApp,
  textOf,
} from '../../../testing/feature-harness';

describe('CarrerasComponent', () => {
  let ctx: AppCtx;
  let el: HTMLElement;
  beforeEach(async () => {
    ctx = setupApp();
    ({ el } = await openRoute(ctx, '/carreras'));
  });
  afterEach(teardownApp);

  const cards = () => [...el.querySelectorAll<HTMLAnchorElement>('.race-card')];

  it('shows the summary, the evolution chart and one card per race (newest first)', () => {
    expect(summaryOf(el, '#races-summary')).toEqual([
      '2 Carreras',
      '1:21:15 Mejor marca',
      '6:05 Mejora total',
    ]);
    expect(el.querySelector('#races-evolution canvas')).not.toBeNull();
    expect(cards().map((c) => textOf(c.querySelector('.race-name')))).toEqual([
      'HYROX Madrid',
      'HYROX Valencia',
    ]);
  });

  it('each card has time, ranks, PB and the delta with the previous race', () => {
    const [madrid, valencia] = cards();
    expect(textOf(madrid.querySelector('.race-time'))).toBe('1:21:15');
    expect(textOf(madrid.querySelector('.race-ranks'))).toBe('#604 división#101 grupo de edad');
    expect(madrid.querySelector('.pb-badge')).not.toBeNull();
    expect(textOf(madrid.querySelector('.race-delta'))).toBe('6:05 más rápido que la anterior');
    expect(valencia.querySelector('.race-delta')).toBeNull();
    expect(madrid.getAttribute('href')).toBe('/carreras/c2');
    // Barra fina con el reparto del tiempo (accesible por su etiqueta)
    expect(madrid.querySelector('.seg-bar')?.getAttribute('aria-label')).toContain('Running 38:53');
  });

  it('empty state when there are no races', async () => {
    await ctx.repo.deleteRace('c1');
    await ctx.repo.deleteRace('c2');
    await settle();
    expect(cards()).toHaveLength(0);
    expect(textOf(el.querySelector('.empty-state'))).toContain(
      'Aún no has importado ninguna carrera',
    );
    expect(el.querySelector('a[href="/carreras/importar"]')).not.toBeNull();
  });
});

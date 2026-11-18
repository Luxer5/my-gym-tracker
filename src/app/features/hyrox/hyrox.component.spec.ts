import {
  AppCtx,
  clickButton,
  openRoute,
  settle,
  setupApp,
  summaryOf,
  teardownApp,
  textOf,
  type,
} from '../../../testing/feature-harness';

describe('HyroxComponent', () => {
  let ctx: AppCtx;
  let el: HTMLElement;
  beforeEach(async () => {
    ctx = setupApp();
    ({ el } = await openRoute(ctx, '/hyrox'));
  });
  afterEach(teardownApp);

  const cards = () => [...el.querySelectorAll('.hyrox-card')];
  const card = (station: string) =>
    cards().find((c) => textOf(c.querySelector('.hx-station')) === `Hyrox · ${station}`)!;

  it('groups the tests by station and parameter', () => {
    expect(summaryOf(el, '#hyrox-summary')).toEqual([
      '4 Tests totales',
      '3 Estaciones',
      '3 Combis distintas',
    ]);
    expect(cards().map((c) => textOf(c.querySelector('.hx-meta')))).toEqual([
      '24 kg/mano',
      '1000 m',
      '6 kg',
    ]);
  });

  it('shows the best time and the improvement', () => {
    const ski = card('SkiErg');
    expect(ski.classList.contains('pb')).toBe(true);
    expect(textOf(ski.querySelector('.time-display'))).toBe('Mejor marca03:48');
    expect(textOf(ski.querySelector('.card-date'))).toBe('↓ Mejora: 00:13 · 2 tests');
  });

  it("the history of «Farmer's Carry» opens (the apostrophe used to break it)", () => {
    const farmer = card("Farmer's Carry");
    clickButton(farmer, 'Historial');
    expect(farmer.querySelectorAll('.history-entry')).toHaveLength(1);
    expect(textOf(farmer.querySelector('.history-entry'))).toContain('01:35');
  });

  it('adds a test: the form adapts to the station', async () => {
    clickButton(el, '+ Nuevo test');
    const doc = el.ownerDocument;
    const label = () => textOf(doc.querySelector('label[for="hx-preset"]'));
    expect(label()).toBe('Distancia (m)');
    type(doc.body, '#hx-station', 'Sled Push');
    expect(label()).toBe('Peso (kg)');
    type(doc.body, '#hx-preset', 'otro');
    type(doc.body, '#hx-custom', '90');
    type(doc.body, '#hx-min', '1');
    type(doc.body, '#hx-sec', '10');
    doc.querySelector<HTMLFormElement>('#hyrox-form')!.requestSubmit();
    await settle();
    expect(doc.querySelector('#hyrox-form')).toBeNull();
    const sled = card('Sled Push');
    expect(textOf(sled.querySelector('.hx-meta'))).toBe('90 kg');
    expect(textOf(sled.querySelector('.time-display'))).toBe('Mejor marca01:10');
  });

  it('a station without parameter asks for nothing; «Otro» asks for a name', () => {
    clickButton(el, '+ Nuevo test');
    const doc = el.ownerDocument;
    type(doc.body, '#hx-station', 'Burpee Broad Jump');
    expect(doc.querySelector('#hx-preset')).toBeNull();
    expect(doc.querySelector('#hx-custom-name')).toBeNull();
    type(doc.body, '#hx-station', 'Otro');
    expect(doc.querySelector('#hx-custom-name')).not.toBeNull();
  });
});

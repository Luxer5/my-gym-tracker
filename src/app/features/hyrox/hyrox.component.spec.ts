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

  const cards = () => [...el.querySelectorAll('#hyrox-grid .hyrox-card')];
  const runCard = (name: string) =>
    [...el.querySelectorAll('.run-card')].find(
      (c) => textOf(c.querySelector('.hx-name')) === name,
    )!;
  const rows = (table: Element | null | undefined) =>
    [...(table?.querySelectorAll('tbody tr') ?? [])].map((r) =>
      [...r.children].map((c) => textOf(c)).join(' | '),
    );
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

  it('SkiErg and RowErg show the pace per 500 m; the other stations do not', () => {
    const ski = card('SkiErg');
    // 1000 m en 03:48 → 1:54 cada 500 m
    expect(textOf(ski.querySelector('.hx-split'))).toBe('Ritmo 1:54 /500 m');
    clickButton(ski, 'Historial');
    const history = [...ski.querySelectorAll('.history-entry')].map((h) => textOf(h));
    expect(history[0]).toContain('03:48 · 1:54 /500 m');
    expect(history[1]).toContain('04:01 · 2:01 /500 m');
    expect(card('Wall Balls').querySelector('.hx-split')).toBeNull();
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

  describe('run tests', () => {
    it('VAM: result, progress and zones from the latest test', () => {
      const vam = runCard('Test VAM');
      expect(textOf(vam.querySelector('.time-display'))).toBe('Último test · 15/09/20261380 m');
      expect(textOf(vam.querySelector('.hx-split'))).toBe('13,8 km/h · 4:21 /km');
      expect(textOf(vam.querySelector('.card-date'))).toBe('+60 m vs. el anterior');
      expect(rows(vam.querySelector('.zone-table'))).toEqual([
        'Zona 1 | 65 % | 6:41 /km',
        'Zona 2 | 70 % | 6:13 /km',
        'Zona 3 | 85 % | 5:07 /km',
        'Zona 4 | 90 % | 4:50 /km',
        'Zona 5 | 95 % | 4:35 /km',
      ]);
    });

    it("Jim Vance 30': pace and heart-rate zones", () => {
      const [pace, hr] = runCard("Test Jim Vance 30'").querySelectorAll('.zone-table');
      expect(rows(pace)).toEqual([
        'Z1 Recuperación | > 7:34 /km',
        'Z2 Aeróbica | 6:41 – 7:34 /km',
        'Z3 Tempo | 6:10 – 6:41 /km',
        'Z4 Umbral / MLSS | 5:52 – 6:10 /km',
        'Z5a Supraumbral | 5:38 – 5:52 /km',
        'Z5b Capacidad aeróbica (VO₂máx) | 5:17 – 5:38 /km',
        'Z5c Capacidad anaeróbica / neuromuscular | < 5:17 /km',
      ]);
      expect(rows(hr)).toEqual([
        'Z1 Recuperación | < 143 lpm',
        'Z2 Aeróbica | 143 – 157 lpm',
        'Z3 Tempo | 157 – 167 lpm',
        'Z4 Umbral / MLSS | 167 – 174 lpm',
        'Z5a Supraumbral | 174 – 180 lpm',
        'Z5b Capacidad aeróbica (VO₂máx) | 180 – 187 lpm',
        'Z5c Capacidad anaeróbica / neuromuscular | > 187 lpm',
      ]);
    });

    it('a new Jim Vance test without heart rate replaces the zones', async () => {
      const doc = el.ownerDocument;
      clickButton(runCard("Test Jim Vance 30'"), 'Registrar');
      expect(textOf(doc.querySelector('.modal-title'))).toBe("Test Jim Vance 30'");
      type(doc.body, '#rt-pace-min', '5');
      type(doc.body, '#rt-pace-sec', '30');
      doc.querySelector<HTMLFormElement>('#run-test-form')!.requestSubmit();
      await settle();
      expect(doc.querySelector('#run-test-form')).toBeNull();

      const card = runCard("Test Jim Vance 30'");
      expect(textOf(card.querySelector('.time-display'))).toBe('Último test · 07/10/20265:30 /km');
      expect(textOf(card.querySelector('.card-date'))).toBe('−0:22 /km vs. el anterior');
      expect(card.querySelectorAll('.zone-table')).toHaveLength(1);
      expect(textOf(card.querySelector('.run-hint'))).toContain('FC media');
    });

    it('the protocol and the history open on demand', () => {
      const vam = runCard('Test VAM');
      expect(vam.querySelector('.run-protocol')).toBeNull();
      clickButton(vam, 'Cómo se hace');
      expect(textOf(vam.querySelector('.run-protocol'))).toContain('6 minutos');
      clickButton(vam, 'Historial');
      expect([...vam.querySelectorAll('.history-entry')].map((h) => textOf(h))).toEqual([
        '1380 m · 13,8 km/h · 4:21 /km15/09/2026 · pista',
        '1320 m · 13,2 km/h · 4:33 /km20/06/2026',
      ]);
    });
  });
});

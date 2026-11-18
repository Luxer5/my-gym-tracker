import {
  AppCtx,
  TODAY,
  clickButton,
  openRoute,
  settle,
  setupApp,
  summaryOf,
  teardownApp,
  textOf,
  type,
} from '../../../testing/feature-harness';

describe('GymComponent', () => {
  let ctx: AppCtx;
  let el: HTMLElement;
  beforeEach(async () => {
    ctx = setupApp();
    ({ el } = await openRoute(ctx, '/gym'));
  });
  afterEach(teardownApp);

  const cards = () => [...el.querySelectorAll('.ex-card')];
  const card = (name: string) => cards().find((c) => textOf(c.querySelector('.ex-name')) === name)!;

  it('shows the summary and one card per exercise', () => {
    expect(summaryOf(el, '#gym-summary')).toEqual(['3 Ejercicios', '2 PRs', '3 RMs']);
    expect(cards().map((c) => textOf(c.querySelector('.ex-name')))).toEqual([
      'Sentadilla',
      'Press banca',
      'Dominadas lastradas',
    ]);
  });

  it('each card shows the best record of each type', () => {
    const boxes = [...card('Sentadilla').querySelectorAll('.rm-box')].map((b) =>
      textOf(b.querySelector('.rm-val')),
    );
    expect(boxes).toEqual(['140kg', '—', '—', '115kg']);
    expect(textOf(card('Sentadilla').querySelector('.card-date'))).toBe(
      'Último registro: 20/09/2026',
    );
  });

  it('filters by category', () => {
    const chips = () => [...el.querySelectorAll<HTMLButtonElement>('.filter-chip')];
    expect(chips().map((c) => textOf(c))).toEqual(['Todos', 'Piernas', 'Empuje', 'Jalón']);
    clickButton(el.querySelector('#gym-filters')!, 'Empuje');
    expect(cards()).toHaveLength(1);
    expect(
      chips()
        .find((c) => c.classList.contains('active'))
        ?.textContent?.trim(),
    ).toBe('Empuje');
    clickButton(el.querySelector('#gym-filters')!, 'Todos');
    expect(cards()).toHaveLength(3);
  });

  it('the history stays open when a new record arrives', async () => {
    clickButton(card('Sentadilla'), 'Historial');
    expect(card('Sentadilla').querySelectorAll('.history-entry')).toHaveLength(3);
    await ctx.repo.addRecord('e1', { type: '1RM', value: 135, date: TODAY, note: '' });
    await settle();
    // Antes, cada cambio repintaba la lista entera y cerraba el historial
    expect(card('Sentadilla').querySelectorAll('.history-entry')).toHaveLength(4);
    expect(textOf(card('Sentadilla').querySelector('.history-entry'))).toContain('1RM135 kg');
  });

  it('adds an exercise from the form', async () => {
    clickButton(el, '+ Nuevo ejercicio');
    const doc = el.ownerDocument;
    expect(doc.querySelector('#exercise-form')).not.toBeNull();
    type(doc.body, '#ex-name', 'Peso muerto');
    type(doc.body, '#ex-category', 'Piernas');
    doc.querySelector<HTMLFormElement>('#exercise-form')!.requestSubmit();
    await settle();
    expect(doc.querySelector('#exercise-form')).toBeNull();
    expect(card('Peso muerto')).toBeTruthy();
    expect(textOf(card('Peso muerto').querySelector('.ex-category'))).toBe('Piernas');
  });

  it('renames an exercise from its card and keeps its records', async () => {
    el.querySelector<HTMLButtonElement>('button[aria-label="Editar Sentadilla"]')!.click();
    await settle();
    const doc = el.ownerDocument;
    expect(textOf(doc.querySelector('.modal-title'))).toBe('Editar ejercicio');
    expect(doc.querySelector<HTMLInputElement>('#ex-name')!.value).toBe('Sentadilla');
    expect(doc.querySelector<HTMLSelectElement>('#ex-category')!.value).toBe('Piernas');
    // La unidad no se cambia: los registros ya guardados están en ella
    expect(doc.querySelector<HTMLSelectElement>('#ex-unit')!.disabled).toBe(true);
    expect(textOf(doc.querySelector('#ex-unit-help'))).toBe('Sus registros están en kg');
    type(doc.body, '#ex-name', 'Sentadilla trasera');
    doc.querySelector<HTMLFormElement>('#exercise-form')!.requestSubmit();
    await settle();
    expect(doc.querySelector('#exercise-form')).toBeNull();
    expect(card('Sentadilla')).toBeUndefined();
    const vals = [...card('Sentadilla trasera').querySelectorAll('.rm-val')].map((v) => textOf(v));
    expect(vals).toEqual(['140kg', '—', '—', '115kg']);
  });

  it('adds a record from the card', async () => {
    clickButton(card('Dominadas lastradas'), '+ Registro');
    const doc = el.ownerDocument;
    expect(textOf(doc.querySelector('.modal-subtitle'))).toBe('Dominadas lastradas · Jalón');
    clickButton(doc.querySelector('.rec-type-grid')!, '5RM');
    type(doc.body, '#rec-value', '20');
    doc.querySelector<HTMLFormElement>('#record-form')!.requestSubmit();
    await settle();
    expect(doc.querySelector('#record-form')).toBeNull();
    const vals = [...card('Dominadas lastradas').querySelectorAll('.rm-val')].map((v) => textOf(v));
    expect(vals).toEqual(['—', '—', '—', '20kg']);
  });

  it('user text is shown as text, never as HTML', async () => {
    await ctx.repo.addExercise({
      name: '<img src=x onerror="window.hacked=1">',
      category: 'Otro',
      unit: 'kg',
      createdAt: '2026-10-07T00:00:00.000Z',
    });
    await settle();
    expect(el.querySelector('.ex-card img')).toBeNull();
    expect(cards().at(-1)?.querySelector('.ex-name')?.textContent).toContain('<img');
  });
});

import { TestBed } from '@angular/core/testing';
import {
  AppCtx,
  settle,
  setupApp,
  teardownApp,
  waitForData,
} from '../../../testing/feature-harness';
import { AuthGateway } from '../auth/auth-gateway';

describe('TrainingStore', () => {
  let ctx: AppCtx;
  beforeEach(() => (ctx = setupApp()));
  afterEach(teardownApp);

  it('loads exercises (with their records) and Hyrox tests after sign-in', async () => {
    await waitForData(ctx.store);
    const ex = ctx.store.exercises();
    expect(ex.map((e) => e.name)).toEqual(['Sentadilla', 'Press banca', 'Dominadas lastradas']);
    expect(ex[0].records.map((r) => r.id)).toEqual(['r1', 'r2', 'r3']);
    expect(ctx.store.hyrox()).toHaveLength(4);
    expect(ctx.store.exercise('e2')?.records).toHaveLength(2);
  });

  it('a new exercise gets its own records subscription', async () => {
    await waitForData(ctx.store);
    const id = await ctx.repo.addExercise({
      name: 'Remo',
      category: 'Jalón',
      unit: 'kg',
      createdAt: '2026-10-07T10:00:00.000Z',
    });
    await settle();
    expect(ctx.store.exercise(id)?.records).toEqual([]);
    await ctx.repo.addRecord(id, { type: '5RM', value: 70, date: '2026-10-07', note: '' });
    await settle();
    expect(ctx.store.exercise(id)?.records.map((r) => r.value)).toEqual([70]);
  });

  it('deleting an exercise closes its records subscription', async () => {
    await waitForData(ctx.store);
    const watch = vi.spyOn(ctx.repo, 'watchRecords');
    await ctx.repo.deleteExercise('e1');
    await settle();
    expect(ctx.store.exercise('e1')).toBeUndefined();
    // Un registro escrito después en esa ruta ya no llega al estado
    await ctx.repo.addRecord('e1', { type: 'PR', value: 1, date: '2026-10-07', note: '' });
    await settle();
    expect(
      ctx.store
        .exercises()
        .flatMap((e) => e.records)
        .some((r) => r.value === 1),
    ).toBe(false);
    // Y no se vuelven a abrir las suscripciones de los demás ejercicios
    expect(watch).not.toHaveBeenCalled();
  });

  it('signing out empties everything', async () => {
    await waitForData(ctx.store);
    await TestBed.inject(AuthGateway).signOut();
    await settle();
    expect(ctx.store.exercises()).toEqual([]);
    expect(ctx.store.hyrox()).toEqual([]);
    expect(ctx.store.exercisesLoaded()).toBe(false);
    expect(ctx.store.hyroxLoaded()).toBe(false);
  });
});

describe('TrainingStore without session', () => {
  afterEach(teardownApp);

  it('does not load anything', async () => {
    const ctx = setupApp({ signedIn: false });
    TestBed.inject(AuthGateway);
    await settle();
    expect(ctx.store.user()).toBeNull();
    expect(ctx.store.exercisesLoaded()).toBe(false);
  });
});

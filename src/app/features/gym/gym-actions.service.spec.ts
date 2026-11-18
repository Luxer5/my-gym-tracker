import { TestBed } from '@angular/core/testing';
import {
  AppCtx,
  NOW,
  TODAY,
  answerConfirm,
  setupApp,
  teardownApp,
  until,
  waitForData,
} from '../../../testing/feature-harness';
import { GymActions } from './gym-actions.service';

describe('GymActions', () => {
  let ctx: AppCtx;
  let svc: GymActions;
  beforeEach(async () => {
    ctx = setupApp();
    await waitForData(ctx.store);
    svc = TestBed.inject(GymActions);
  });
  afterEach(teardownApp);

  describe('addExercise', () => {
    it('validates before writing', async () => {
      const add = vi.spyOn(ctx.repo, 'addExercise');
      expect(await svc.addExercise({ name: ' ', category: 'Piernas', unit: 'kg' })).toBe(false);
      expect(ctx.alert).toHaveBeenCalledWith('Escribe el nombre del ejercicio.');
      expect(add).not.toHaveBeenCalled();
    });

    it('saves and reports the result', async () => {
      const add = vi.spyOn(ctx.repo, 'addExercise');
      expect(await svc.addExercise({ name: 'Remo', category: 'Jalón', unit: 'kg' })).toBe(true);
      expect(add).toHaveBeenCalledWith({
        name: 'Remo',
        category: 'Jalón',
        unit: 'kg',
        createdAt: NOW.toISOString(),
      });
      expect(ctx.status.mock.calls).toEqual([['Guardando…'], ['«Remo» añadido ✓', true]]);
    });

    it('reports write errors', async () => {
      vi.spyOn(ctx.repo, 'addExercise').mockRejectedValue(new Error('sin permiso'));
      expect(await svc.addExercise({ name: 'Remo', category: 'Jalón', unit: 'kg' })).toBe(false);
      expect(ctx.alert).toHaveBeenCalledWith('Error: sin permiso');
      expect(ctx.status).toHaveBeenLastCalledWith('');
    });
  });

  describe('updateExercise', () => {
    it('renames it without touching its unit or its records', async () => {
      const upd = vi.spyOn(ctx.repo, 'updateExercise');
      const form = { name: ' Sentadilla trasera ', category: 'Piernas', unit: 'lb' };
      expect(await svc.updateExercise('e1', form)).toBe(true);
      expect(upd).toHaveBeenCalledWith('e1', { name: 'Sentadilla trasera', category: 'Piernas' });
      expect(ctx.status.mock.calls).toEqual([
        ['Guardando…'],
        ['«Sentadilla trasera» guardado ✓', true],
      ]);
      await until(() => ctx.store.exercise('e1')?.name === 'Sentadilla trasera');
      expect(ctx.store.exercise('e1')).toMatchObject({ unit: 'kg', category: 'Piernas' });
      expect(ctx.store.exercise('e1')!.records).toHaveLength(3);
    });

    it('validates; without changes or with an unknown id it writes nothing', async () => {
      const upd = vi.spyOn(ctx.repo, 'updateExercise');
      const same = { name: 'Sentadilla', category: 'Piernas', unit: 'kg' };
      expect(await svc.updateExercise('e1', { ...same, name: '' })).toBe(false);
      expect(ctx.alert).toHaveBeenCalledWith('Escribe el nombre del ejercicio.');
      expect(await svc.updateExercise('e1', same)).toBe(true);
      expect(await svc.updateExercise('nope', same)).toBe(false);
      expect(upd).not.toHaveBeenCalled();
    });

    it('reports write errors', async () => {
      vi.spyOn(ctx.repo, 'updateExercise').mockRejectedValue(new Error('sin permiso'));
      const form = { name: 'X', category: 'Piernas', unit: 'kg' };
      expect(await svc.updateExercise('e1', form)).toBe(false);
      expect(ctx.alert).toHaveBeenCalledWith('Error: sin permiso');
    });
  });

  describe('deleteExercise', () => {
    it('asks for a destructive confirmation that mentions the records', async () => {
      const del = vi.spyOn(ctx.repo, 'deleteExercise');
      const p = svc.deleteExercise('e1');
      const req = await answerConfirm(ctx.confirm, true);
      expect(await p).toBe(true);
      expect(req).toMatchObject({
        title: 'Eliminar ejercicio',
        message: '¿Eliminar «Sentadilla» y sus 3 registros? No se puede deshacer.',
        danger: true,
      });
      expect(del).toHaveBeenCalledWith('e1');
    });

    it('an exercise without records gets a shorter message', async () => {
      const p = svc.deleteExercise('e3');
      const req = await answerConfirm(ctx.confirm, false);
      expect(await p).toBe(false);
      expect(req.message).toBe('¿Eliminar «Dominadas lastradas»?');
    });

    it('cancelling keeps it; unknown ids are ignored', async () => {
      const del = vi.spyOn(ctx.repo, 'deleteExercise');
      const p = svc.deleteExercise('e1');
      await answerConfirm(ctx.confirm, false);
      expect(await p).toBe(false);
      expect(await svc.deleteExercise('nope')).toBe(false);
      expect(del).not.toHaveBeenCalled();
    });
  });

  describe('records', () => {
    it('addRecord validates the weight', async () => {
      const add = vi.spyOn(ctx.repo, 'addRecord');
      expect(await svc.addRecord('e1', { type: 'PR', value: '', date: TODAY, note: '' })).toBe(
        false,
      );
      expect(ctx.alert).toHaveBeenCalledWith('Introduce el peso.');
      expect(add).not.toHaveBeenCalled();
    });

    it('addRecord saves it in the exercise', async () => {
      const add = vi.spyOn(ctx.repo, 'addRecord');
      expect(
        await svc.addRecord('e1', { type: '3RM', value: '120,5', date: '', note: ' ok ' }),
      ).toBe(true);
      expect(add).toHaveBeenCalledWith('e1', {
        type: '3RM',
        value: 120.5,
        date: TODAY,
        note: 'ok',
      });
      expect(ctx.status).toHaveBeenLastCalledWith('3RM registrado ✓', true);
    });

    it('deleteRecord asks first', async () => {
      const del = vi.spyOn(ctx.repo, 'deleteRecord');
      let p = svc.deleteRecord('e1', 'r2');
      await answerConfirm(ctx.confirm, false);
      expect(await p).toBe(false);
      expect(del).not.toHaveBeenCalled();
      p = svc.deleteRecord('e1', 'r2');
      await answerConfirm(ctx.confirm, true);
      expect(await p).toBe(true);
      expect(del).toHaveBeenCalledWith('e1', 'r2');
    });
  });
});

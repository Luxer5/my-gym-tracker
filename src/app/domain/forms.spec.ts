import {
  HyroxForm,
  OTHER_PRESET,
  defaultPreset,
  emptyExerciseForm,
  emptyHyroxForm,
  emptyRecordForm,
  formToExercise,
  formToHyrox,
  formToRecord,
} from './forms';

const NOW = new Date(2026, 9, 7, 10, 0);

describe('forms', () => {
  describe('formToExercise', () => {
    it('trims the name and stamps createdAt', () => {
      const res = formToExercise({ name: '  Sentadilla ', category: 'Piernas', unit: 'lb' }, NOW);
      expect(res).toEqual({
        ok: true,
        data: { name: 'Sentadilla', category: 'Piernas', unit: 'lb', createdAt: NOW.toISOString() },
      });
    });

    it('requires a name of at most 100 characters', () => {
      expect(formToExercise({ ...emptyExerciseForm(), name: '  ' })).toEqual({
        ok: false,
        error: 'Escribe el nombre del ejercicio.',
      });
      expect(formToExercise({ ...emptyExerciseForm(), name: 'x'.repeat(101) }).ok).toBe(false);
    });

    it('unknown units fall back to kg', () => {
      const res = formToExercise({ name: 'Remo', category: 'Jalón', unit: 'stone' });
      expect(res.ok && res.data.unit).toBe('kg');
    });
  });

  describe('formToRecord', () => {
    it('parses the weight and defaults the date to today', () => {
      const res = formToRecord({ type: '3RM', value: '82,5', date: '', note: ' sin faja ' }, NOW);
      expect(res).toEqual({
        ok: true,
        data: { type: '3RM', value: 82.5, date: '2026-10-07', note: 'sin faja' },
      });
    });

    it('rejects missing, zero, negative and absurd weights', () => {
      const base = emptyRecordForm(NOW);
      for (const value of ['', '0', '-5', 'abc'])
        expect(formToRecord({ ...base, value })).toEqual({
          ok: false,
          error: 'Introduce el peso.',
        });
      expect(formToRecord({ ...base, value: '2500' }).ok).toBe(false);
    });

    it('emptyRecordForm starts as a PR dated today', () => {
      expect(emptyRecordForm(NOW)).toEqual({ type: 'PR', value: '', date: '2026-10-07', note: '' });
    });
  });

  describe('formToHyrox', () => {
    const form = (patch: Partial<HyroxForm>): HyroxForm => ({ ...emptyHyroxForm(NOW), ...patch });

    it('distance station with a preset', () => {
      expect(
        formToHyrox(form({ station: 'SkiErg', preset: '1000', min: '3', sec: '45' }), NOW),
      ).toEqual({
        ok: true,
        data: { station: 'SkiErg', param: 1000, totalSec: 225, date: '2026-10-07', note: '' },
      });
    });

    it('custom distance and custom weight', () => {
      const d = formToHyrox(
        form({ station: 'Running', preset: OTHER_PRESET, custom: '800', sec: '30' }),
      );
      expect(d.ok && d.data.param).toBe(800);
      const w = formToHyrox(
        form({ station: 'Sled Push', preset: OTHER_PRESET, custom: '0', min: '1' }),
      );
      expect(w.ok && w.data.param).toBe(0);
    });

    it('missing distance or weight', () => {
      expect(
        formToHyrox(form({ station: 'RowErg', preset: OTHER_PRESET, custom: '', min: '1' })),
      ).toEqual({
        ok: false,
        error: 'Introduce la distancia.',
      });
      expect(
        formToHyrox(form({ station: 'Wall Balls', preset: OTHER_PRESET, custom: '', min: '1' })),
      ).toEqual({
        ok: false,
        error: 'Introduce el peso.',
      });
    });

    it('stations without parameter store null; «Otro» uses the custom name', () => {
      const b = formToHyrox(form({ station: 'Burpee Broad Jump', preset: '', min: '4' }));
      expect(b.ok && b.data).toMatchObject({
        station: 'Burpee Broad Jump',
        param: null,
        totalSec: 240,
      });
      const o = formToHyrox(
        form({ station: 'Otro', preset: '', customName: ' Circuito A ', sec: '50' }),
      );
      expect(o.ok && o.data.station).toBe('Circuito A');
      const unnamed = formToHyrox(form({ station: 'Otro', preset: '', sec: '50' }));
      expect(unnamed.ok && unnamed.data.station).toBe('Otro');
    });

    it('validates the time', () => {
      expect(formToHyrox(form({ preset: '500' }))).toEqual({
        ok: false,
        error: 'Introduce el tiempo.',
      });
      expect(formToHyrox(form({ preset: '500', sec: '75' }))).toEqual({
        ok: false,
        error: 'Los segundos van de 0 a 59.',
      });
      expect(formToHyrox(form({ preset: '500', min: '1.5' })).ok).toBe(false);
      expect(formToHyrox(form({ preset: '500', min: '-1', sec: '10' })).ok).toBe(false);
    });

    it('defaultPreset', () => {
      expect(defaultPreset('SkiErg')).toBe('500');
      expect(defaultPreset('Sled Push')).toBe('60');
      expect(defaultPreset('Otro')).toBe('');
    });
  });
});

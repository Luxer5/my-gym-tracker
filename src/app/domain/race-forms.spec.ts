import { PASTE_DESKTOP, PASTE_EXPECTED } from '../../testing/race-paste';
import { RaceForm, emptyRaceForm, formSplits, formToRace, parsedToForm } from './race-forms';
import { parseRaceText } from './race-import';

const NOW = new Date(2026, 9, 7, 10, 0);

const filled = (): RaceForm => parsedToForm(parseRaceText(PASTE_DESKTOP), NOW);

describe('race forms', () => {
  it('parsedToForm writes the times as text', () => {
    const f = filled();
    expect(f.runs[0]).toBe('04:18');
    expect(f.stations[7]).toBe('06:29');
    expect(f.total).toBe('1:19:25');
    expect(f.roxzone).toBe('06:25');
    expect(f.rankOverall).toBe('512');
    expect(f.event).toBe('HYROX Barcelona');
  });

  it('parsedToForm keeps defaults for what was not found', () => {
    const f = parsedToForm(parseRaceText(''), NOW);
    expect(f.date).toBe('2026-10-07');
    expect(f.division).toBe('HYROX Men');
    expect(f.runs).toEqual(Array(8).fill(''));
  });

  it('formToRace builds the race from a complete form', () => {
    const res = formToRace(filled(), NOW);
    expect(res).toEqual({
      ok: true,
      data: {
        event: 'HYROX Barcelona',
        date: '2026-09-27',
        division: 'HYROX Men',
        ageGroup: '30-34',
        athlete: 'Atleta Demo',
        runs: PASTE_EXPECTED.runs,
        stations: PASTE_EXPECTED.stations,
        roxzoneSec: 385,
        totalSec: 4765,
        rankOverall: 512,
        rankAgeGroup: 88,
        note: '',
        createdAt: NOW.toISOString(),
      },
    });
  });

  it('derives the Roxzone from the total, or the total from the Roxzone', () => {
    const noRox = formToRace({ ...filled(), roxzone: '' });
    expect(noRox.ok && noRox.data.roxzoneSec).toBe(385);
    const noTotal = formToRace({ ...filled(), total: '' });
    expect(noTotal.ok && noTotal.data.totalSec).toBe(4765);
    const neither = formToRace({ ...filled(), total: '', roxzone: '' });
    expect(neither.ok && neither.data).toMatchObject({ totalSec: 4380, roxzoneSec: null });
  });

  it('validates every field', () => {
    const f = filled();
    const err = (patch: Partial<RaceForm>) => {
      const r = formToRace({ ...f, ...patch });
      return r.ok ? null : r.error;
    };
    expect(err({ event: ' ' })).toBe('Escribe el nombre de la carrera.');
    expect(err({ date: '' })).toBe('Indica la fecha de la carrera.');
    expect(err({ runs: f.runs.map((r, i) => (i === 2 ? '' : r)) })).toBe(
      'Revisa el tiempo de Running 3.',
    );
    expect(err({ stations: f.stations.map((s, i) => (i === 5 ? '45:00' : s)) })).toBe(
      "Revisa el tiempo de Farmer's Carry.",
    );
    expect(err({ roxzone: 'abc' })).toBe('Revisa el tiempo de la Roxzone.');
    expect(err({ total: '1:00:00' })).toBe(
      'El total es menor que la suma de los tramos (1:13:00).',
    );
    expect(err({ rankOverall: '12.5' })).toBe('La posición tiene que ser un número entero.');
    expect(err({ note: 'x'.repeat(501) })).toBe('La nota no puede pasar de 500 caracteres.');
    expect(err({ rankAgeGroup: '#88' })).toBeNull();
  });

  it('formSplits sums what has been written', () => {
    expect(formSplits(filled())).toEqual({ sum: 4380, complete: true });
    expect(formSplits(emptyRaceForm(NOW))).toEqual({ sum: 0, complete: false });
  });
});

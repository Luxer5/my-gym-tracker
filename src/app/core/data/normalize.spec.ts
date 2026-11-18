import { toExercise, toHyrox, toRace, toRecord } from './normalize';

describe('normalize', () => {
  it('races: always 8 laps and 8 stations; wrong values become empty', () => {
    expect(
      toRace({ id: 'r', event: 'HYROX Madrid', runs: [250, '260'], stations: 'x', totalSec: 4800 }),
    ).toEqual({
      id: 'r',
      event: 'HYROX Madrid',
      date: '',
      division: '',
      ageGroup: '',
      athlete: '',
      runs: [250, 0, 0, 0, 0, 0, 0, 0],
      stations: [0, 0, 0, 0, 0, 0, 0, 0],
      roxzoneSec: null,
      totalSec: 4800,
      rankOverall: null,
      rankAgeGroup: null,
      note: '',
      createdAt: '',
    });
  });

  it('keeps well-formed documents as they are', () => {
    expect(
      toExercise({
        id: 'e1',
        name: 'Sentadilla',
        category: 'Piernas',
        unit: 'lb',
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    ).toEqual({
      id: 'e1',
      name: 'Sentadilla',
      category: 'Piernas',
      unit: 'lb',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('fills missing or wrong fields of old documents', () => {
    expect(toExercise({ id: 'x' })).toEqual({
      id: 'x',
      name: 'Sin nombre',
      category: 'Otro',
      unit: 'kg',
      createdAt: '',
    });
    expect(toRecord({ id: 'r', type: '7RM', value: '100' })).toEqual({
      id: 'r',
      type: 'PR',
      value: 0,
      date: '',
      note: '',
    });
    expect(toHyrox({ id: 'h', station: 'SkiErg', param: '1000', totalSec: 90 })).toEqual({
      id: 'h',
      station: 'SkiErg',
      param: null,
      totalSec: 90,
      date: '',
      note: '',
    });
  });
});

import { HyroxTest } from '../core/models';
import { groupKey, hyroxGroups, hyroxSummary, paramLabel, stationConfig } from './hyrox';

const t = (
  id: string,
  station: string,
  param: number | null,
  totalSec: number,
  date: string,
): HyroxTest => ({ id, station, param, totalSec, date, note: '' });

describe('hyrox', () => {
  it('stationConfig: unknown (custom) stations have no parameter', () => {
    expect(stationConfig('SkiErg').kind).toBe('distance');
    expect(stationConfig('Wall Balls').kind).toBe('weight');
    expect(stationConfig('Mi circuito').kind).toBe('none');
  });

  it('paramLabel and groupKey', () => {
    expect(paramLabel({ station: 'SkiErg', param: 1000 })).toBe('1000 m');
    expect(paramLabel({ station: "Farmer's Carry", param: 24 })).toBe('24 kg/mano');
    expect(paramLabel({ station: 'Burpee Broad Jump', param: null })).toBe('');
    expect(groupKey({ station: 'SkiErg', param: 1000 })).toBe('SkiErg|1000 m');
    expect(groupKey({ station: 'Burpee Broad Jump', param: null })).toBe('Burpee Broad Jump');
  });

  it('a weight of 0 still counts as a parameter', () => {
    expect(paramLabel({ station: 'Sled Push', param: 0 })).toBe('0 kg');
  });

  describe('hyroxGroups', () => {
    const list = [
      t('h1', 'SkiErg', 1000, 240, '2026-09-01'),
      t('h2', 'SkiErg', 1000, 225, '2026-10-01'),
      t('h3', 'SkiErg', 500, 110, '2026-09-10'),
      t('h4', 'RowErg', 2000, 480, '2026-09-05'),
      t('h5', 'SkiErg', 1000, 250, '2026-08-01'),
    ];
    const groups = hyroxGroups(list);

    it('groups by station + parameter, sorted by station then parameter', () => {
      expect(groups.map((g) => g.key)).toEqual(['RowErg|2000 m', 'SkiErg|500 m', 'SkiErg|1000 m']);
    });

    it('entries go from best to worst time', () => {
      const ski = groups[2];
      expect(ski.entries.map((e) => e.id)).toEqual(['h2', 'h1', 'h5']);
      expect(ski.best.id).toBe('h2');
      expect(ski.hasPB).toBe(true);
    });

    it('improvement compares the earliest test with the best one', () => {
      // primero (ago): 250 s → mejor: 225 s
      expect(groups[2].improvement).toBe(25);
      expect(groups[0].improvement).toBe(0);
      expect(groups[0].hasPB).toBe(false);
    });

    it('no improvement when the first test is the best', () => {
      const [g] = hyroxGroups([
        t('a', 'RowErg', 500, 100, '2026-01-01'),
        t('b', 'RowErg', 500, 120, '2026-02-01'),
      ]);
      expect(g.improvement).toBe(0);
      expect(g.hasPB).toBe(true);
    });

    it('empty list', () => {
      expect(hyroxGroups([])).toEqual([]);
    });
  });

  it('hyroxSummary counts tests, stations and combos', () => {
    expect(
      hyroxSummary([
        t('a', 'SkiErg', 1000, 1, '2026-01-01'),
        t('b', 'SkiErg', 500, 1, '2026-01-01'),
        t('c', 'SkiErg', 500, 1, '2026-01-01'),
        t('d', 'Running', 400, 1, '2026-01-01'),
      ]),
    ).toEqual({ tests: 4, stations: 2, combos: 3 });
  });
});

import { HyroxRace, HyroxTest } from '../core/models';
import {
  avgRun,
  compareRaces,
  previousRace,
  raceBreakdown,
  raceCards,
  raceInsights,
  raceSegments,
  racesSummary,
  roxzoneOf,
  runExtremes,
  runFade,
  runTotal,
  slowestStation,
  sortRaces,
  stationTotal,
  trainingComparison,
} from './race';

const race = (patch: Partial<HyroxRace> = {}): HyroxRace => ({
  id: 'a',
  event: 'HYROX Valencia',
  date: '2025-11-15',
  division: 'HYROX Men',
  ageGroup: '30-34',
  athlete: 'Atleta Demo',
  runs: [272, 298, 305, 310, 302, 315, 331, 322],
  stations: [272, 205, 268, 395, 281, 128, 332, 452],
  roxzoneSec: 452,
  totalSec: 5240,
  rankOverall: 812,
  rankAgeGroup: 143,
  note: '',
  createdAt: '2025-11-16T10:00:00.000Z',
  ...patch,
});

const madrid = race({
  id: 'b',
  event: 'HYROX Madrid',
  date: '2026-04-18',
  runs: [262, 285, 290, 296, 288, 299, 312, 301],
  stations: [262, 186, 241, 361, 270, 118, 305, 401],
  roxzoneSec: 398,
  totalSec: 4875,
  createdAt: '2026-04-19T10:00:00.000Z',
});

describe('race', () => {
  it('raceSegments interleaves runs and stations in race order', () => {
    const seg = raceSegments(race());
    expect(seg).toHaveLength(16);
    expect(seg.slice(0, 4).map((s) => s.label)).toEqual([
      'Running 1',
      'SkiErg',
      'Running 2',
      'Sled Push',
    ]);
    expect(seg[15]).toMatchObject({ kind: 'station', label: 'Wall Balls', short: 'WB', sec: 452 });
  });

  it('totals, Roxzone (stored or derived) and average pace', () => {
    expect(runTotal(race())).toBe(2455);
    expect(stationTotal(race())).toBe(2333);
    expect(roxzoneOf(race())).toBe(452);
    expect(roxzoneOf(race({ roxzoneSec: null }))).toBe(452);
    expect(roxzoneOf(race({ roxzoneSec: null, totalSec: 100 }))).toBe(0);
    expect(avgRun(race())).toBeCloseTo(306.875);
  });

  it('raceBreakdown shares add up to one', () => {
    const parts = raceBreakdown(race());
    expect(parts.map((p) => [p.key, p.sec])).toEqual([
      ['run', 2455],
      ['stations', 2333],
      ['roxzone', 452],
    ]);
    expect(parts.reduce((s, p) => s + p.share, 0)).toBeCloseTo(1);
  });

  it('run extremes, fade and slowest station', () => {
    expect(runExtremes(race())).toEqual({
      best: { index: 0, sec: 272 },
      worst: { index: 6, sec: 331 },
    });
    // (302+315+331+322)/4 − (272+298+305+310)/4 = 317.5 − 296.25
    expect(runFade(race())).toBeCloseTo(21.25);
    expect(slowestStation(race())).toEqual({ index: 7, sec: 452 });
  });

  it('raceInsights describes pace, extremes, fade, slowest station and Roxzone', () => {
    expect(raceInsights(race())).toEqual([
      'Corriste 40:55 (47 % del total) a una media de 5:07 /km.',
      'Tu vuelta más rápida fue la 1 (04:32) y la más lenta la 7 (05:31).',
      'En la segunda mitad perdiste 00:21 por km respecto a la primera.',
      'La estación más larga fue Wall Balls (07:32).',
      'En la Roxzone pasaste 07:32 (9 % del total).',
    ]);
  });

  it('raceInsights: even pace and negative split', () => {
    const even = race({ runs: Array(8).fill(300) });
    expect(raceInsights(even)[2]).toBe('Mantuviste el ritmo de running de principio a fin.');
    const negative = race({ runs: [320, 320, 320, 320, 300, 300, 300, 300] });
    expect(raceInsights(negative)[2]).toBe(
      'Acabaste más fuerte: la segunda mitad fue 00:20 por km más rápida.',
    );
  });

  it('compareRaces gives per-segment deltas plus Roxzone and total', () => {
    const rows = compareRaces(madrid, race());
    expect(rows).toHaveLength(18);
    expect(rows[0]).toEqual({
      label: 'Running 1',
      kind: 'run',
      sec: 262,
      otherSec: 272,
      delta: -10,
    });
    expect(rows.at(-2)).toMatchObject({ label: 'Roxzone', delta: -54 });
    expect(rows.at(-1)).toMatchObject({ label: 'Total', delta: -365 });
  });

  it('sorting and previous race of the same division', () => {
    const pro = race({ id: 'p', division: 'HYROX PRO Men', date: '2026-01-10' });
    const list = [race(), pro, madrid];
    expect(sortRaces(list).map((r) => r.id)).toEqual(['b', 'p', 'a']);
    expect(previousRace(madrid, list)?.id).toBe('a');
    expect(previousRace(race(), list)).toBeNull();
    expect(previousRace(pro, list)).toBeNull();
  });

  it('raceCards marks the PB per division and the delta with the previous race', () => {
    const cards = raceCards([race(), madrid]);
    expect(cards.map((c) => [c.race.id, c.isPB, c.deltaPrev])).toEqual([
      ['b', true, -365],
      ['a', false, null],
    ]);
    // Con una sola carrera no hay «PB» que destacar
    expect(raceCards([race()])[0].isPB).toBe(false);
  });

  it('racesSummary', () => {
    expect(racesSummary([])).toEqual({ count: 0, best: null, improvement: 0 });
    const s = racesSummary([race(), madrid]);
    expect(s.count).toBe(2);
    expect(s.best?.id).toBe('b');
    expect(s.improvement).toBe(365);
  });

  it('trainingComparison matches SkiErg, Row and Running 1000 m tests', () => {
    const t = (
      station: string,
      param: number,
      totalSec: number,
      date = '2026-09-01',
    ): HyroxTest => ({
      id: station + totalSec,
      station,
      param,
      totalSec,
      date,
      note: '',
    });
    const rows = trainingComparison(madrid, [
      t('SkiErg', 1000, 241),
      t('SkiErg', 1000, 228, '2026-09-25'),
      t('SkiErg', 500, 100),
      t('Running', 1000, 229),
      t('RowErg', 2000, 480),
    ]);
    expect(rows).toEqual([
      {
        label: 'Running',
        detail: 'mejor vuelta de 1 km',
        raceSec: 262,
        trainingSec: 229,
        trainingDate: '2026-09-01',
      },
      {
        label: 'SkiErg',
        detail: '1000 m',
        raceSec: 262,
        trainingSec: 228,
        trainingDate: '2026-09-25',
      },
    ]);
    expect(trainingComparison(madrid, [])).toEqual([]);
  });
});

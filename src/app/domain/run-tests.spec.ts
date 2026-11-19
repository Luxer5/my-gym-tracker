import { RunTest } from '../core/models';
import { fmtPace } from './format';
import {
  hrRangeLabel,
  paceRangeLabel,
  runTestDetail,
  runTestProgress,
  runTestValue,
  runTestsOf,
  vamKmh,
  vamPace,
  vamZones,
  vanceHrZones,
  vancePaceZones,
} from './run-tests';

const vam = (id: string, distanceM: number, date: string): RunTest => ({
  id,
  kind: 'vam',
  distanceM,
  paceSec: null,
  lthr: null,
  powerW: null,
  date,
  note: '',
});
const vance = (
  id: string,
  paceSec: number,
  date: string,
  lthr: number | null = null,
  powerW: number | null = null,
): RunTest => ({ id, kind: 'vance30', distanceM: null, paceSec, lthr, powerW, date, note: '' });

describe('run-tests', () => {
  describe('Test VAM', () => {
    it('VAM and average pace from the metres covered in 6 minutes', () => {
      expect(vamKmh(1400)).toBeCloseTo(14);
      expect(fmtPace(vamPace(1400))).toBe('4:17 /km');
      expect(vamKmh(1500)).toBeCloseTo(15);
      expect(fmtPace(vamPace(1500))).toBe('4:00 /km');
    });

    it('zones at 65, 70, 85, 90 and 95 % of the VAM (same values as Hyprogram)', () => {
      const zones = vamZones(1400);
      expect(zones.map((z) => z.name)).toEqual(['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4', 'Zona 5']);
      expect(zones.map((z) => z.pct)).toEqual([0.65, 0.7, 0.85, 0.9, 0.95]);
      expect(zones.map((z) => fmtPace(z.paceSec))).toEqual([
        '6:36 /km',
        '6:07 /km',
        '5:03 /km',
        '4:46 /km',
        '4:31 /km',
      ]);
    });
  });

  describe("Test Jim Vance 30'", () => {
    it('pace zones: 129, 114, 105, 100, 96 and 90 % of the threshold pace', () => {
      const zones = vancePaceZones(300);
      expect(zones.map((z) => z.name)).toEqual(['Z1', 'Z2', 'Z3', 'Z4', 'Z5a', 'Z5b', 'Z5c']);
      expect(zones.map(paceRangeLabel)).toEqual([
        '> 6:27 /km',
        '5:42 – 6:27 /km',
        '5:15 – 5:42 /km',
        '5:00 – 5:15 /km',
        '4:48 – 5:00 /km',
        '4:30 – 4:48 /km',
        '< 4:30 /km',
      ]);
    });

    it('pace limits are rounded to the second (Hyprogram example: 5:47 /km)', () => {
      expect(vancePaceZones(347).map(paceRangeLabel)).toEqual([
        '> 7:28 /km',
        '6:36 – 7:28 /km',
        '6:04 – 6:36 /km',
        '5:47 – 6:04 /km',
        '5:33 – 5:47 /km',
        '5:12 – 5:33 /km',
        '< 5:12 /km',
      ]);
    });

    it('heart-rate zones: 81, 89, 95, 99, 102 and 106 % of the LTHR, rounded', () => {
      const zones = vanceHrZones(180);
      expect(zones.map(hrRangeLabel)).toEqual([
        '< 146 lpm',
        '146 – 160 lpm',
        '160 – 171 lpm',
        '171 – 178 lpm',
        '178 – 184 lpm',
        '184 – 191 lpm',
        '> 191 lpm',
      ]);
      expect(zones[3].label).toBe('Umbral / MLSS');
    });
  });

  describe('history', () => {
    it('runTestsOf filters by kind, newest first', () => {
      const list = [
        vam('a', 1350, '2026-07-01'),
        vance('b', 350, '2026-08-01'),
        vam('c', 1400, '2026-09-01'),
      ];
      expect(runTestsOf(list, 'vam').map((t) => t.id)).toEqual(['c', 'a']);
      expect(runTestsOf(list, 'vance30').map((t) => t.id)).toEqual(['b']);
    });

    it('value and detail of each kind', () => {
      expect(runTestValue(vam('a', 1400, '2026-09-01'))).toBe('1400 m');
      expect(runTestDetail(vam('a', 1400, '2026-09-01'))).toBe('14,0 km/h · 4:17 /km');
      expect(runTestValue(vance('b', 347, '2026-09-01', 181, 250))).toBe('5:47 /km');
      expect(runTestDetail(vance('b', 347, '2026-09-01', 181, 250))).toBe('181 lpm · 250 W');
      expect(runTestDetail(vance('b', 347, '2026-09-01'))).toBe('');
    });

    it('progress: more metres or a faster pace is better', () => {
      expect(runTestProgress(vam('a', 1400, 'x'), undefined)).toEqual({
        text: 'Primer test',
        better: false,
      });
      expect(runTestProgress(vam('a', 1400, 'x'), vam('b', 1350, 'y'))).toEqual({
        text: '+50 m vs. el anterior',
        better: true,
      });
      expect(runTestProgress(vam('a', 1300, 'x'), vam('b', 1350, 'y'))).toEqual({
        text: '−50 m vs. el anterior',
        better: false,
      });
      expect(runTestProgress(vance('a', 340, 'x'), vance('b', 348, 'y'))).toEqual({
        text: '−0:08 /km vs. el anterior',
        better: true,
      });
      expect(runTestProgress(vance('a', 348, 'x'), vance('b', 348, 'y')).text).toBe(
        'Igual que el anterior',
      );
    });
  });
});

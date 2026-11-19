import { TooltipItem } from 'chart.js';
import { RunTest } from '../../core/models';
import { ZONE_COLORS, runTestChart, zoneColor } from './run-test-charts';

const test = (patch: Partial<RunTest>): RunTest => ({
  id: 't',
  kind: 'vam',
  distanceM: null,
  paceSec: null,
  lthr: null,
  powerW: null,
  date: '2026-01-01',
  note: '',
  ...patch,
});

type Callback = (...args: unknown[]) => unknown;
const call = (fn: unknown, ...args: unknown[]) => (fn as Callback)(...args);
const item = (dataIndex: number) => ({ dataIndex }) as TooltipItem<'line'>;

describe('run test charts', () => {
  it('zone colours: five steps, the 5a/5b/5c sub-zones share the last one', () => {
    expect(ZONE_COLORS).toHaveLength(5);
    expect(zoneColor(0)).toBe(ZONE_COLORS[0]);
    expect(zoneColor(4)).toBe(ZONE_COLORS[4]);
    expect(zoneColor(6)).toBe(ZONE_COLORS[4]);
  });

  it('no chart with fewer than two tests', () => {
    expect(runTestChart([])).toBeNull();
    expect(runTestChart([test({ distanceM: 1380 })])).toBeNull();
  });

  it('VAM: metres from the oldest to the newest test, with date and detail in the tooltip', () => {
    const c = runTestChart([
      test({ id: 'b', distanceM: 1380, date: '2026-09-15' }),
      test({ id: 'a', distanceM: 1320, date: '2026-06-20' }),
    ])!;
    expect(c.data.labels).toEqual(['20/06/26', '15/09/26']);
    expect(c.data.datasets[0].data).toEqual([1320, 1380]);
    const y = c.options!.scales!['y'] as { reverse: boolean; ticks: { callback: Callback } };
    expect(y.reverse).toBe(false);
    expect(y.ticks.callback(1350)).toBe('1350 m');
    const tip = c.options!.plugins!.tooltip!.callbacks!;
    expect(call(tip.title, [item(1)])).toBe('15/09/2026');
    expect(call(tip.label, item(1))).toBe('1380 m · 13,8 km/h · 4:21 /km');
  });

  it('Jim Vance: pace with the axis reversed, so faster is higher', () => {
    const c = runTestChart([
      test({ kind: 'vance30', paceSec: 352, lthr: 176, date: '2026-08-28' }),
      test({ kind: 'vance30', paceSec: 366, date: '2026-05-23' }),
    ])!;
    expect(c.data.datasets[0].data).toEqual([366, 352]);
    const y = c.options!.scales!['y'] as { reverse: boolean; ticks: { callback: Callback } };
    expect(y.reverse).toBe(true);
    expect(y.ticks.callback(352)).toBe('5:52');
    expect(call(c.options!.plugins!.tooltip!.callbacks!.label, item(1))).toBe('5:52 /km · 176 lpm');
  });
});

import { TooltipItem } from 'chart.js';
import { demoData } from '../../core/data/demo-data';
import { blockTrend, compareRaces, raceGap } from '../../domain/race';
import {
  RACE_COLORS,
  blocksChart,
  breakdownParts,
  deltaChart,
  evolutionChart,
  gapChart,
  lapsChart,
  splitsChart,
} from './race-charts';

const [valencia, madrid] = demoData().races;

type Callback = (...args: unknown[]) => unknown;
/** Llama a un callback de las opciones de Chart.js con un tooltip de prueba */
const call = (fn: unknown, ...args: unknown[]) => (fn as Callback)(...args);
const item = (raw: number | null, dataIndex: number, datasetIndex = 0) =>
  ({ raw, dataIndex, datasetIndex }) as TooltipItem<'bar'>;

describe('race charts', () => {
  it('breakdownParts: running, stations and Roxzone with their colors', () => {
    expect(breakdownParts(madrid)).toEqual([
      { label: 'Running', value: 2333, color: RACE_COLORS.run, text: '38:53' },
      { label: 'Estaciones', value: 2144, color: RACE_COLORS.station, text: '35:44' },
      { label: 'Roxzone', value: 398, color: RACE_COLORS.roxzone, text: '06:38' },
    ]);
  });

  it('splitsChart: 16 bars split in two series, mm:ss tooltips', () => {
    const c = splitsChart(madrid);
    expect(c.data.labels).toHaveLength(16);
    expect(c.data.labels?.slice(0, 3)).toEqual(['R1', 'Ski', 'R2']);
    const [run, st] = c.data.datasets;
    expect(run.label).toBe('Running');
    expect(run.data.slice(0, 4)).toEqual([262, null, 285, null]);
    expect(st.data.slice(0, 4)).toEqual([null, 262, null, 186]);
    const tip = c.options!.plugins!.tooltip!.callbacks!;
    expect(call(tip.title, [item(186, 3)])).toBe('Sled Push');
    expect(call(tip.label, item(186, 3))).toBe('03:06');
    expect(call(c.options!.plugins!.tooltip!.filter, item(null, 3))).toBe(false);
  });

  it('splitsChart with another race: hollow grey points and the difference in the tooltip', () => {
    const c = splitsChart(madrid, valencia);
    expect(c.data.datasets).toHaveLength(3);
    const ghost = c.data.datasets[2];
    expect(ghost.type).toBe('line');
    expect(ghost.label).toBe('Valencia');
    expect(ghost.data.slice(0, 2)).toEqual([272, 272]);
    const tip = c.options!.plugins!.tooltip!.callbacks!;
    expect(call(tip.label, item(272, 0, 2))).toBe('Valencia: 04:32 (−0:10)');
    expect(call(tip.label, item(262, 0, 0))).toBe('04:22');
  });

  it('lapsChart with another race: its laps as a third line', () => {
    const c = lapsChart(madrid, valencia);
    expect(c.data.datasets).toHaveLength(3);
    expect(c.data.datasets[2].label).toBe('Valencia');
    expect(c.data.datasets[2].data).toEqual(valencia.runs);
    const tip = c.options!.plugins!.tooltip!.callbacks!;
    // Media de Madrid: 2333 / 8 ≈ 292
    expect(call(tip.label, item(262, 0, 0))).toBe('Vuelta: 04:22 (−0:30 vs. media)');
    expect(call(tip.label, item(272, 0, 2))).toBe('Valencia: 04:32 (−0:10)');
  });

  it('gapChart: cumulative advantage from the start to the finish', () => {
    const c = gapChart(raceGap(madrid, valencia), 'HYROX Valencia');
    expect(c.data.labels).toHaveLength(18);
    expect(c.data.labels?.[0]).toBe('Salida');
    expect(c.data.labels?.at(-1)).toBe('Meta');
    expect(c.data.datasets[0].data[0]).toBe(0);
    expect(c.data.datasets[0].data.at(-1)).toBe(365);
    const tip = c.options!.plugins!.tooltip!.callbacks!;
    expect(call(tip.title, [item(10, 1)])).toBe('Tras Running 1');
    expect(call(tip.label, item(365, 17))).toBe('6:05 por delante');
    expect(call(tip.label, item(-30, 3))).toBe('0:30 por detrás');
    expect(call(tip.label, item(0, 0))).toBe('Empatados');
  });

  it('blocksChart: running, stations and Roxzone against the first race', () => {
    const c = blocksChart(blockTrend([madrid, valencia]));
    expect(c.data.labels).toEqual(['Valencia', 'Madrid']);
    expect(c.data.datasets.map((d) => d.label)).toEqual(['Running', 'Estaciones', 'Roxzone']);
    expect(c.data.datasets.map((d) => d.data[1])).toEqual([-122, -189, -54]);
    const tip = c.options!.plugins!.tooltip!.callbacks!;
    const running = { ...item(-122, 1), dataset: { label: 'Running' } };
    expect(call(tip.label, running)).toBe('Running: −2:02 vs. Valencia');
  });

  it('lapsChart: laps plus the average line', () => {
    const c = lapsChart(madrid);
    expect(c.data.labels?.[0]).toBe('Km 1');
    expect(c.data.datasets[0].data).toEqual(madrid.runs);
    expect(c.data.datasets[1].label).toBe('Media (04:52)');
    expect(new Set(c.data.datasets[1].data)).toEqual(new Set([292]));
  });

  it('deltaChart: faster and slower segments in diverging colors', () => {
    const rows = compareRaces(madrid, valencia);
    const c = deltaChart(rows, 'HYROX Valencia');
    // 16 tramos + Roxzone (el total va aparte)
    expect(c.data.labels).toHaveLength(17);
    expect(c.options!.indexAxis).toBe('y');
    const [faster, slower] = c.data.datasets;
    expect(faster.backgroundColor).toBe(RACE_COLORS.faster);
    expect(slower.backgroundColor).toBe(RACE_COLORS.slower);
    expect(faster.data[0]).toBe(-10);
    expect(slower.data.every((v) => v === null)).toBe(true);
    expect(call(c.options!.plugins!.tooltip!.callbacks!.label, item(-10, 0))).toBe(
      '−0:10 (04:22 frente a 04:32 en HYROX Valencia)',
    );
  });

  it('evolutionChart: oldest to newest, h:mm:ss', () => {
    const c = evolutionChart([madrid, valencia]);
    expect(c.data.labels).toEqual(['Valencia', 'Madrid']);
    expect(c.data.datasets[0].data).toEqual([5240, 4875]);
    const tip = c.options!.plugins!.tooltip!.callbacks!;
    expect(call(tip.title, [item(4875, 1)])).toBe('HYROX Madrid · 18/04/2026');
    expect(call(tip.label, item(4875, 1))).toBe('1:21:15 · HYROX Men');
    const y = c.options!.scales!['y'] as { ticks: { callback: Callback } };
    expect(y.ticks.callback(4800)).toBe('1:20:00');
  });
});

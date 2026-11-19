import {
  ChartConfiguration,
  ScriptableLineSegmentContext,
  ScriptableScaleContext,
  TooltipItem,
} from 'chart.js';
import { HyroxRace } from '../../core/models';
import { fmtDelta, fmtDmy, fmtDuration, fmtMinSec, fmtTime } from '../../domain/format';
import {
  BlockTrend,
  GapPoint,
  SegmentDelta,
  avgRun,
  raceBreakdown,
  raceSegments,
  runExtremes,
} from '../../domain/race';
import {
  PointNote,
  barValueLabels,
  hoverGuide,
  pointNotes,
  rgba,
  seriesWash as wash,
} from '../../shared/chart-plugins';
import { BarPart } from '../../shared/segmented-bar.component';

/**
 * Configuración de las gráficas de carreras. Colores validados para el fondo oscuro de las
 * tarjetas (#151d2e, tema «Podio») con el validador de la guía de visualización: separación con
 * daltonismo, banda de luminosidad y contraste 3:1. Running, estaciones y Roxzone pasan también la
 * prueba «todos con todos», así que valen para líneas que se cruzan.
 */
export const RACE_COLORS = {
  run: '#c98500',
  station: '#3987e5',
  roxzone: '#d55181',
  /** Par divergente: más rápido / más lento */
  faster: '#199e70',
  slower: '#d95926',
  neutral: '#6b6b6b',
  /** La otra carrera en las comparaciones: gris claro (de-énfasis) con punto hueco */
  other: '#9aa3b2',
  surface: '#151d2e',
} as const;

const GRID = 'rgba(238, 241, 247, 0.08)';
/** Línea del cero en los ejes de diferencias: un poco más marcada que la rejilla */
const ZERO = 'rgba(238, 241, 247, 0.34)';
/** Línea de la ventaja acumulada: casi tinta, con el tramo coloreado por el signo */
const LEAD = '#e6e9ef';

/** Pasos «redondos» de un eje de tiempos, en segundos */
const STEPS = [5, 10, 15, 20, 30, 60, 120, 300, 600, 900, 1800, 3600];

/** Paso redondo para que el rango quepa en como mucho `max` marcas (60 s → 01:00, 02:00…) */
export function niceStep(range: number, max = 5): number {
  return STEPS.find((s) => range / s <= max) ?? STEPS[STEPS.length - 1];
}

/** Eje de tiempos (mm:ss o h:mm:ss) con marcas en valores redondos */
const timeAxis = (range: number, fmt: (v: number) => string = fmtTime) => ({
  grid: { color: GRID },
  border: { display: false },
  ticks: { callback: (v: number | string) => fmt(+v), stepSize: niceStep(range) },
});
/** Eje de diferencias (±m:ss) con el cero marcado */
const deltaAxis = (range: number) => ({
  grid: {
    color: (c: ScriptableScaleContext) => (c.tick?.value === 0 ? ZERO : GRID),
    lineWidth: (c: ScriptableScaleContext) => (c.tick?.value === 0 ? 1.5 : 1),
  },
  border: { display: false },
  ticks: { callback: (v: number | string) => fmtDelta(+v), stepSize: niceStep(range) },
});
const spread = (values: readonly number[]) => Math.max(...values) - Math.min(...values);
const categoryAxis = {
  grid: { display: false },
  border: { display: false },
  ticks: { maxRotation: 0, autoSkipPadding: 8 },
};
/** Punto con anillo del color de la superficie (se lee aunque cruce otra línea) */
const ringed = (color: string, radius = 4) => ({
  pointRadius: radius,
  pointHoverRadius: radius + 2,
  pointBackgroundColor: color,
  pointBorderColor: RACE_COLORS.surface,
  pointBorderWidth: 2,
  pointHitRadius: 12,
});
/** Punto hueco gris: la otra carrera en cualquier gráfica */
const hollow = {
  pointStyle: 'circle' as const,
  pointRadius: 4.5,
  pointHoverRadius: 6,
  pointBackgroundColor: RACE_COLORS.surface,
  pointBorderColor: RACE_COLORS.other,
  pointBorderWidth: 2,
  pointHitRadius: 12,
};
/** «HYROX Madrid» → «Madrid» para leyendas y ejes */
const shortName = (event: string): string => event.replace(/^HYROX\s+/i, '');

/** Reparto del tiempo para la barra segmentada */
export function breakdownParts(race: HyroxRace): BarPart[] {
  const color = {
    run: RACE_COLORS.run,
    stations: RACE_COLORS.station,
    roxzone: RACE_COLORS.roxzone,
  };
  return raceBreakdown(race).map((p) => ({
    label: p.label,
    value: p.sec,
    color: color[p.key],
    text: fmtDuration(p.sec),
  }));
}

type SplitsConfig = ChartConfiguration<'bar' | 'line', (number | null)[], string>;

/**
 * Tramo a tramo: 16 barras, running y estaciones en dos series (con leyenda) y la cifra encima si
 * cabe. Con otra carrera, su tiempo en cada tramo es un punto hueco gris sobre la barra.
 */
export function splitsChart(race: HyroxRace, other: HyroxRace | null = null): SplitsConfig {
  const seg = raceSegments(race);
  const theirs = other ? raceSegments(other) : [];
  const bar = {
    borderRadius: 4,
    borderSkipped: 'start' as const,
    grouped: false,
    barPercentage: 0.78,
    categoryPercentage: 0.9,
    maxBarThickness: 24,
  };
  const top = Math.max(...seg.map((s) => s.sec), ...theirs.map((s) => s.sec));
  const datasets: SplitsConfig['data']['datasets'] = [
    {
      label: 'Running',
      data: seg.map((s) => (s.kind === 'run' ? s.sec : null)),
      backgroundColor: RACE_COLORS.run,
      hoverBackgroundColor: rgba(RACE_COLORS.run, 0.85),
      ...bar,
    },
    {
      label: 'Estaciones',
      data: seg.map((s) => (s.kind === 'station' ? s.sec : null)),
      backgroundColor: RACE_COLORS.station,
      hoverBackgroundColor: rgba(RACE_COLORS.station, 0.85),
      ...bar,
    },
  ];
  if (other)
    datasets.push({
      type: 'line',
      label: shortName(other.event),
      data: theirs.map((s) => s.sec),
      showLine: false,
      borderColor: RACE_COLORS.other,
      backgroundColor: RACE_COLORS.surface,
      order: -1,
      ...hollow,
    });
  return {
    type: 'bar',
    data: { labels: seg.map((s) => s.short), datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: { sort: (a, b) => (a.datasetIndex ?? 0) - (b.datasetIndex ?? 0) },
        },
        tooltip: {
          filter: (item: TooltipItem<'bar' | 'line'>) => item.raw != null,
          itemSort: (a, b) => a.datasetIndex - b.datasetIndex,
          callbacks: {
            title: (items: TooltipItem<'bar' | 'line'>[]) => seg[items[0].dataIndex].label,
            label: (c: TooltipItem<'bar' | 'line'>) => {
              const sec = c.raw as number;
              if (c.datasetIndex < 2) return fmtTime(sec);
              const diff = seg[c.dataIndex].sec - sec;
              return `${shortName(other!.event)}: ${fmtTime(sec)} (${fmtDelta(diff)})`;
            },
          },
        },
      },
      scales: {
        x: categoryAxis,
        y: { ...timeAxis(top), beginAtZero: true, grace: '12%' },
      },
    },
    plugins: [hoverGuide<'bar' | 'line'>(), barValueLabels<'bar' | 'line'>((v) => fmtMinSec(v))],
  };
}

/**
 * Ritmo de las 8 vueltas de 1 km frente a la media, con la mejor y la peor señaladas. Con otra
 * carrera, sus vueltas van en gris con punto hueco.
 */
export function lapsChart(
  race: HyroxRace,
  other: HyroxRace | null = null,
): ChartConfiguration<'line'> {
  const avg = Math.round(avgRun(race));
  const { best, worst } = runExtremes(race);
  const radius = race.runs.map((_, i) => (i === best.index || i === worst.index ? 5.5 : 4));
  const datasets: ChartConfiguration<'line'>['data']['datasets'] = [
    {
      label: shortName(race.event),
      data: race.runs,
      borderColor: RACE_COLORS.run,
      backgroundColor: wash(RACE_COLORS.run, 0.16),
      fill: 'origin',
      borderWidth: 2,
      tension: 0.3,
      ...ringed(RACE_COLORS.run),
      pointRadius: radius,
    },
    {
      label: `Media (${fmtTime(avg)})`,
      data: race.runs.map(() => avg),
      borderColor: RACE_COLORS.neutral,
      borderWidth: 1.5,
      borderDash: [2, 4],
      // En la leyenda, una raya (no un círculo hueco, que es el de la otra carrera)
      pointStyle: 'line',
      pointRadius: 0,
      pointHoverRadius: 0,
      pointHitRadius: 0,
    },
  ];
  if (other)
    datasets.push({
      label: shortName(other.event),
      data: other.runs,
      borderColor: RACE_COLORS.other,
      borderWidth: 2,
      tension: 0.3,
      ...hollow,
    });
  const notes: PointNote[] = [
    { datasetIndex: 0, index: best.index, text: `Mejor ${fmtMinSec(best.sec)}`, place: 'below' },
    { datasetIndex: 0, index: worst.index, text: `Peor ${fmtMinSec(worst.sec)}`, place: 'above' },
  ].map((n) => ({ ...n, avoid: other ? [2] : [] }) as PointNote);
  const all = [...race.runs, ...(other?.runs ?? [])];
  return {
    type: 'line',
    data: { labels: race.runs.map((_, i) => `Km ${i + 1}`), datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      layout: { padding: { top: 6 } },
      plugins: {
        legend: { position: 'top', align: 'end' },
        tooltip: {
          filter: (item: TooltipItem<'line'>) => item.datasetIndex !== 1 || !other,
          callbacks: {
            label: (c: TooltipItem<'line'>) => {
              const sec = c.raw as number;
              if (c.datasetIndex === 0)
                return `Vuelta: ${fmtTime(sec)} (${fmtDelta(sec - avg)} vs. media)`;
              if (c.datasetIndex === 1) return `Media: ${fmtTime(sec)}`;
              return `${shortName(other!.event)}: ${fmtTime(sec)} (${fmtDelta(race.runs[c.dataIndex] - sec)})`;
            },
          },
        },
      },
      scales: {
        x: categoryAxis,
        y: { ...timeAxis(Math.max(30, spread(all)) * 1.4), grace: '18%' },
      },
    },
    plugins: [hoverGuide<'line'>(), pointNotes<'line'>(notes)],
  };
}

/** Diferencias tramo a tramo con otra carrera: barras horizontales divergentes con su cifra */
export function deltaChart(
  rows: readonly SegmentDelta[],
  otherName: string,
): ChartConfiguration<'bar'> {
  const parts = rows.filter((r) => r.kind !== 'total');
  const bar = {
    borderRadius: 4,
    grouped: false,
    barPercentage: 0.8,
    categoryPercentage: 0.9,
    maxBarThickness: 16,
  };
  return {
    type: 'bar',
    data: {
      labels: parts.map((r) => r.label),
      datasets: [
        {
          label: 'Más rápido',
          data: parts.map((r) => (r.delta < 0 ? r.delta : null)),
          backgroundColor: RACE_COLORS.faster,
          ...bar,
        },
        {
          label: 'Más lento',
          data: parts.map((r) => (r.delta > 0 ? r.delta : null)),
          backgroundColor: RACE_COLORS.slower,
          ...bar,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false, axis: 'y' },
      plugins: {
        legend: { position: 'top', align: 'end' },
        tooltip: {
          filter: (item: TooltipItem<'bar'>) => item.raw != null,
          callbacks: {
            label: (c: TooltipItem<'bar'>) => {
              const r = parts[c.dataIndex];
              return `${fmtDelta(r.delta)} (${fmtTime(r.sec)} frente a ${fmtTime(r.otherSec)} en ${otherName})`;
            },
          },
        },
      },
      scales: {
        x: {
          ...deltaAxis(Math.max(10, spread([0, ...parts.map((r) => r.delta)]))),
          grace: '14%',
        },
        y: { ...categoryAxis, ticks: { autoSkip: false, font: { size: 11 } } },
      },
    },
    plugins: [hoverGuide<'bar'>(), barValueLabels<'bar'>((v) => fmtDelta(v))],
  };
}

/**
 * Ventaja acumulada sobre otra carrera tramo a tramo: por encima del cero vas por delante (verde),
 * por debajo, por detrás (naranja). La nota final es la diferencia oficial en meta.
 */
export function gapChart(
  points: readonly GapPoint[],
  otherName: string,
): ChartConfiguration<'line'> {
  const words = (gap: number) =>
    gap > 0
      ? `${fmtDelta(gap).slice(1)} por delante`
      : gap < 0
        ? `${fmtDelta(-gap).slice(1)} por detrás`
        : 'Empatados';
  const last = points.length - 1;
  const final = points[last].gap;
  const sign = (v: number | null | undefined) =>
    (v ?? 0) >= 0 ? RACE_COLORS.faster : RACE_COLORS.slower;
  return {
    type: 'line',
    data: {
      labels: points.map((p) => p.short),
      datasets: [
        {
          label: `Ventaja sobre ${otherName}`,
          data: points.map((p) => p.gap),
          borderColor: LEAD,
          borderWidth: 2,
          tension: 0.25,
          fill: {
            target: 'origin',
            above: rgba(RACE_COLORS.faster, 0.18),
            below: rgba(RACE_COLORS.slower, 0.18),
          },
          segment: { borderColor: (c: ScriptableLineSegmentContext) => sign(c.p1.parsed.y) },
          ...ringed(LEAD, 3),
          pointBackgroundColor: points.map((p) => sign(p.gap)),
          pointRadius: points.map((_, i) => (i === last ? 5.5 : 3)),
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      layout: { padding: { top: 8, bottom: 4 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items: TooltipItem<'line'>[]) => points[items[0].dataIndex].label,
            label: (c: TooltipItem<'line'>) => words(c.raw as number),
          },
        },
      },
      scales: {
        x: categoryAxis,
        y: { ...deltaAxis(Math.max(20, spread([0, ...points.map((p) => p.gap)]))), grace: '20%' },
      },
    },
    plugins: [
      hoverGuide<'line'>(),
      pointNotes<'line'>([
        {
          datasetIndex: 0,
          index: last,
          text: `Meta: ${words(final)}`,
          place: final >= 0 ? 'above' : 'below',
        },
      ]),
    ],
  };
}

/** Evolución del tiempo total, de la carrera más antigua a la más reciente, con la PB señalada */
export function evolutionChart(races: readonly HyroxRace[]): ChartConfiguration<'line'> {
  const list = [...races].sort((a, b) => a.date.localeCompare(b.date));
  const best = list.reduce((b, r, i) => (r.totalSec < list[b].totalSec ? i : b), 0);
  const last = list.length - 1;
  const notes: PointNote[] = [
    { datasetIndex: 0, index: best, text: `PB ${fmtDuration(list[best].totalSec)}` },
  ];
  if (last !== best)
    notes.push({ datasetIndex: 0, index: last, text: fmtDuration(list[last].totalSec) });
  return {
    type: 'line',
    data: {
      labels: list.map((r) => shortName(r.event)),
      datasets: [
        {
          label: 'Tiempo total',
          data: list.map((r) => r.totalSec),
          borderColor: RACE_COLORS.run,
          backgroundColor: wash(RACE_COLORS.run, 0.22),
          fill: true,
          borderWidth: 2,
          tension: 0.3,
          ...ringed(RACE_COLORS.run, 5),
          pointRadius: list.map((_, i) => (i === best ? 6.5 : 5)),
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      layout: { padding: { top: 8, left: 6, right: 6 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items: TooltipItem<'line'>[]) => {
              const r = list[items[0].dataIndex];
              return `${r.event} · ${fmtDmy(r.date)}`;
            },
            label: (c: TooltipItem<'line'>) =>
              `${fmtDuration(c.raw as number)} · ${list[c.dataIndex].division}`,
          },
        },
      },
      scales: {
        x: { ...categoryAxis, offset: true },
        y: {
          ...timeAxis(Math.max(120, spread(list.map((r) => r.totalSec))) * 1.3, fmtDuration),
          grace: '22%',
        },
      },
    },
    plugins: [hoverGuide<'line'>(), pointNotes<'line'>(notes)],
  };
}

/**
 * De dónde viene la mejora: running, estaciones y Roxzone de cada carrera frente a la primera, en
 * un solo eje de diferencias (menos es mejor). Cada línea lleva su cifra final.
 */
export function blocksChart(trend: readonly BlockTrend[]): ChartConfiguration<'line'> {
  const series = [
    { key: 'run', label: 'Running', color: RACE_COLORS.run },
    { key: 'stations', label: 'Estaciones', color: RACE_COLORS.station },
    { key: 'roxzone', label: 'Roxzone', color: RACE_COLORS.roxzone },
  ] as const;
  const last = trend.length - 1;
  const values = trend.flatMap((t) => [t.run, t.stations, t.roxzone]);
  return {
    type: 'line',
    data: {
      labels: trend.map((t) => shortName(t.race.event)),
      datasets: series.map((s) => ({
        label: s.label,
        data: trend.map((t) => t[s.key]),
        borderColor: s.color,
        backgroundColor: s.color,
        borderWidth: 2,
        tension: 0.25,
        ...ringed(s.color),
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      layout: { padding: { top: 4, left: 6, right: 6 } },
      plugins: {
        legend: { position: 'top', align: 'end' },
        tooltip: {
          callbacks: {
            title: (items: TooltipItem<'line'>[]) => {
              const r = trend[items[0].dataIndex].race;
              return `${r.event} · ${fmtDmy(r.date)}`;
            },
            label: (c: TooltipItem<'line'>) =>
              `${c.dataset.label}: ${fmtDelta(c.raw as number)} vs. ${shortName(trend[0].race.event)}`,
          },
        },
      },
      scales: {
        x: { ...categoryAxis, offset: true },
        y: { ...deltaAxis(Math.max(30, spread([0, ...values]))), grace: '18%' },
      },
    },
    plugins: [
      hoverGuide<'line'>(),
      pointNotes<'line'>(
        series.map((s, i) => ({
          datasetIndex: i,
          index: last,
          text: fmtDelta(trend[last]?.[s.key] ?? 0),
          place: (trend[last]?.[s.key] ?? 0) < 0 ? 'below' : 'above',
        })),
      ),
    ],
  };
}

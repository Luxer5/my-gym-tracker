import { ChartConfiguration, TooltipItem } from 'chart.js';
import { HyroxRace } from '../../core/models';
import { fmtDelta, fmtDmy, fmtDuration, fmtTime } from '../../domain/format';
import { SegmentDelta, avgRun, raceBreakdown, raceSegments } from '../../domain/race';
import { BarPart } from '../../shared/segmented-bar.component';

/**
 * Configuración de las gráficas de carreras. Colores validados para el fondo oscuro de las
 * tarjetas (#1a1a1a) con el validador de la guía de visualización: separación con daltonismo,
 * banda de luminosidad y contraste 3:1.
 */
export const RACE_COLORS = {
  run: '#c98500',
  station: '#3987e5',
  roxzone: '#d55181',
  /** Par divergente: más rápido / más lento */
  faster: '#199e70',
  slower: '#d95926',
  neutral: '#6b6b6b',
  surface: '#1a1a1a',
} as const;

const GRID = 'rgba(240, 237, 232, 0.08)';

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
const spread = (values: readonly number[]) => Math.max(...values) - Math.min(...values);
const categoryAxis = { grid: { display: false }, border: { display: false } };

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

/** Tramo a tramo: 16 barras, running y estaciones en dos series (con leyenda) */
export function splitsChart(race: HyroxRace): ChartConfiguration<'bar'> {
  const seg = raceSegments(race);
  const bar = {
    borderRadius: 4,
    borderSkipped: 'start' as const,
    grouped: false,
    barPercentage: 0.78,
    categoryPercentage: 0.9,
  };
  return {
    type: 'bar',
    data: {
      labels: seg.map((s) => s.short),
      datasets: [
        {
          label: 'Running',
          data: seg.map((s) => (s.kind === 'run' ? s.sec : null)),
          backgroundColor: RACE_COLORS.run,
          ...bar,
        },
        {
          label: 'Estaciones',
          data: seg.map((s) => (s.kind === 'station' ? s.sec : null)),
          backgroundColor: RACE_COLORS.station,
          ...bar,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', align: 'end' },
        tooltip: {
          filter: (item: TooltipItem<'bar'>) => item.raw != null,
          callbacks: {
            title: (items: TooltipItem<'bar'>[]) => seg[items[0].dataIndex].label,
            label: (c: TooltipItem<'bar'>) => fmtTime(c.raw as number),
          },
        },
      },
      scales: {
        x: categoryAxis,
        y: { ...timeAxis(Math.max(...seg.map((s) => s.sec))), beginAtZero: true },
      },
    },
  };
}

/** Ritmo de las 8 vueltas de 1 km frente a la media */
export function lapsChart(race: HyroxRace): ChartConfiguration<'line'> {
  const avg = Math.round(avgRun(race));
  return {
    type: 'line',
    data: {
      labels: race.runs.map((_, i) => `Km ${i + 1}`),
      datasets: [
        {
          label: 'Vuelta',
          data: race.runs,
          borderColor: RACE_COLORS.run,
          backgroundColor: RACE_COLORS.run,
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBorderColor: RACE_COLORS.surface,
          pointBorderWidth: 2,
        },
        {
          label: `Media (${fmtTime(avg)})`,
          data: race.runs.map(() => avg),
          borderColor: RACE_COLORS.neutral,
          borderWidth: 1.5,
          borderDash: [6, 4],
          pointRadius: 0,
          pointHoverRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', align: 'end' },
        tooltip: {
          callbacks: {
            label: (c: TooltipItem<'line'>) =>
              `${c.datasetIndex ? 'Media' : 'Vuelta'}: ${fmtTime(c.raw as number)}`,
          },
        },
      },
      scales: {
        x: categoryAxis,
        y: { ...timeAxis(Math.max(30, spread(race.runs)) * 1.4), grace: '10%' },
      },
    },
  };
}

/** Diferencias tramo a tramo con otra carrera: barras horizontales divergentes */
export function deltaChart(
  rows: readonly SegmentDelta[],
  otherName: string,
): ChartConfiguration<'bar'> {
  const parts = rows.filter((r) => r.kind !== 'total');
  const bar = { borderRadius: 4, grouped: false, barPercentage: 0.8, categoryPercentage: 0.9 };
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
        x: timeAxis(Math.max(10, spread([0, ...parts.map((r) => r.delta)])), fmtDelta),
        y: { ...categoryAxis, ticks: { autoSkip: false, font: { size: 11 } } },
      },
    },
  };
}

/** Evolución del tiempo total, de la carrera más antigua a la más reciente */
export function evolutionChart(races: readonly HyroxRace[]): ChartConfiguration<'line'> {
  const list = [...races].sort((a, b) => a.date.localeCompare(b.date));
  return {
    type: 'line',
    data: {
      labels: list.map((r) => r.event.replace(/^HYROX\s+/i, '')),
      datasets: [
        {
          label: 'Tiempo total',
          data: list.map((r) => r.totalSec),
          borderColor: RACE_COLORS.run,
          backgroundColor: 'rgba(201, 133, 0, 0.12)',
          fill: true,
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: RACE_COLORS.run,
          pointBorderColor: RACE_COLORS.surface,
          pointBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
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
        x: categoryAxis,
        y: {
          ...timeAxis(Math.max(120, spread(list.map((r) => r.totalSec))) * 1.3, fmtDuration),
          grace: '8%',
        },
      },
    },
  };
}

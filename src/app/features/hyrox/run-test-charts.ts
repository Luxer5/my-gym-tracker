import { ChartConfiguration, TooltipItem } from 'chart.js';
import { RunTest } from '../../core/models';
import { fmtDmy, fmtDmyShort, fmtMinSec } from '../../domain/format';
import { runTestDetail, runTestValue } from '../../domain/run-tests';
import { hoverGuide, pointNotes, seriesWash } from '../../shared/chart-plugins';
import { RACE_COLORS } from '../carreras/race-charts';

/**
 * Colores de las zonas de entrenamiento: rampa ordinal de un solo tono (azul, pasos 550 → 150 de la
 * paleta de referencia de la guía de visualización), de la zona más suave (oscura, se funde con la
 * tarjeta) a la más intensa (clara). Validada con `validate_palette.js --ordinal --mode dark
 * --surface #151d2e`: luminosidad monótona, saltos ≥ 0,06 y la más oscura a 2,5:1 de la tarjeta.
 * Con 7 zonas (Jim Vance) no caben 7 pasos distinguibles de la paleta: Z5a, Z5b y Z5c comparten el
 * de la zona 5 (lo son) y se distinguen por su nombre, que siempre va escrito.
 */
export const ZONE_COLORS = ['#1c5cab', '#2a78d6', '#5598e7', '#86b6ef', '#b7d3f6'] as const;

/** Color de la zona i (0 = Z1); las subzonas de la 5 comparten el último */
export const zoneColor = (i: number): string => ZONE_COLORS[Math.min(i, ZONE_COLORS.length - 1)];

/**
 * Progresión de un tipo de test, del más antiguo al más reciente: metros del VAM o ritmo del de Jim
 * Vance. En el ritmo el eje va al revés para que más rápido quede arriba (como en los relojes de
 * running); así, en los dos, subir es mejorar. La primera y la última marca llevan su cifra.
 * null con menos de dos tests: no hay progresión que enseñar.
 */
export function runTestChart(tests: readonly RunTest[]): ChartConfiguration<'line'> | null {
  const list = [...tests].sort((a, b) => a.date.localeCompare(b.date));
  if (list.length < 2) return null;
  const vam = list[0].kind === 'vam';
  const values = list.map((t) => (vam ? (t.distanceM ?? 0) : (t.paceSec ?? 0)));
  const fmt = (v: number) => (vam ? `${v} m` : fmtMinSec(v));
  const last = list.length - 1;
  return {
    type: 'line',
    data: {
      labels: list.map((t) => fmtDmyShort(t.date)),
      datasets: [
        {
          label: vam ? 'Distancia en 6 minutos' : 'Ritmo medio de los 30 minutos',
          data: values,
          borderColor: RACE_COLORS.run,
          backgroundColor: seriesWash(RACE_COLORS.run, 0.2),
          // El velo va hacia abajo en los dos: «start» es el borde inferior también con el eje
          // invertido del ritmo
          fill: 'start',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: RACE_COLORS.run,
          pointBorderColor: RACE_COLORS.surface,
          pointBorderWidth: 2,
          pointHitRadius: 14,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      layout: { padding: { top: 6, left: 4, right: 4 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items: TooltipItem<'line'>[]) => fmtDmy(list[items[0].dataIndex].date),
            label: (c: TooltipItem<'line'>) => {
              const t = list[c.dataIndex];
              return [runTestValue(t), runTestDetail(t)].filter(Boolean).join(' · ');
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          offset: true,
          ticks: { maxRotation: 0, autoSkipPadding: 8 },
        },
        y: {
          reverse: !vam,
          grace: '35%',
          grid: { color: 'rgba(238, 241, 247, 0.08)' },
          border: { display: false },
          ticks: { maxTicksLimit: 4, callback: (v: number | string) => fmt(+v) },
        },
      },
    },
    plugins: [
      hoverGuide<'line'>(),
      pointNotes<'line'>([
        { datasetIndex: 0, index: 0, text: fmt(values[0]) },
        { datasetIndex: 0, index: last, text: fmt(values[last]) },
      ]),
    ],
  };
}

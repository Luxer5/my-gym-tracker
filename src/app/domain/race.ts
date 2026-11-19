import { HyroxRace, HyroxTest } from '../core/models';
import { fmtDuration, fmtPace, fmtTime } from './format';

/** Número de vueltas de running y de estaciones de una carrera HYROX */
export const RACE_LAPS = 8;

export interface RaceStation {
  key: string;
  label: string;
  /** Etiqueta corta para los ejes de las gráficas */
  short: string;
  /** Distancia o repeticiones de la estación */
  detail: string;
  /** Estación y distancia de los tests de la pantalla Hyrox con los que se puede comparar */
  training?: { station: string; param: number };
}

/** Estaciones de una carrera HYROX, en orden */
export const RACE_STATIONS: readonly RaceStation[] = [
  {
    key: 'skierg',
    label: 'SkiErg',
    short: 'Ski',
    detail: '1000 m',
    training: { station: 'SkiErg', param: 1000 },
  },
  { key: 'sledPush', label: 'Sled Push', short: 'Push', detail: '50 m' },
  { key: 'sledPull', label: 'Sled Pull', short: 'Pull', detail: '50 m' },
  { key: 'burpees', label: 'Burpee Broad Jump', short: 'BBJ', detail: '80 m' },
  {
    key: 'row',
    label: 'Row',
    short: 'Row',
    detail: '1000 m',
    training: { station: 'RowErg', param: 1000 },
  },
  { key: 'farmers', label: "Farmer's Carry", short: 'Farmers', detail: '200 m' },
  { key: 'lunges', label: 'Sandbag Lunges', short: 'Lunges', detail: '100 m' },
  { key: 'wallBalls', label: 'Wall Balls', short: 'WB', detail: '100 reps' },
];

/** Divisiones habituales (sugerencias del formulario; se puede escribir otra) */
export const RACE_DIVISIONS = [
  'HYROX Men',
  'HYROX Women',
  'HYROX PRO Men',
  'HYROX PRO Women',
  'HYROX Doubles Men',
  'HYROX Doubles Women',
  'HYROX Doubles Mixed',
  'HYROX Relay',
] as const;

export const runLabel = (i: number): string => `Running ${i + 1}`;

export interface RaceSegment {
  kind: 'run' | 'station';
  /** Vuelta o estación (0-7) */
  index: number;
  label: string;
  short: string;
  sec: number;
}

/** Los 16 tramos en orden de carrera: Running 1, SkiErg, Running 2, Sled Push… */
export function raceSegments(race: Pick<HyroxRace, 'runs' | 'stations'>): RaceSegment[] {
  return RACE_STATIONS.flatMap((st, i) => [
    {
      kind: 'run' as const,
      index: i,
      label: runLabel(i),
      short: `R${i + 1}`,
      sec: race.runs[i] ?? 0,
    },
    {
      kind: 'station' as const,
      index: i,
      label: st.label,
      short: st.short,
      sec: race.stations[i] ?? 0,
    },
  ]);
}

const sum = (list: readonly number[]): number => list.reduce((s, v) => s + (v || 0), 0);

export const runTotal = (race: Pick<HyroxRace, 'runs'>): number => sum(race.runs);
export const stationTotal = (race: Pick<HyroxRace, 'stations'>): number => sum(race.stations);

/** Roxzone guardada o, si falta, lo que queda del total tras running y estaciones */
export const roxzoneOf = (race: HyroxRace): number =>
  race.roxzoneSec ?? Math.max(0, race.totalSec - runTotal(race) - stationTotal(race));

/** Ritmo medio de running, en segundos por km */
export const avgRun = (race: Pick<HyroxRace, 'runs'>): number => runTotal(race) / RACE_LAPS;

export interface RacePart {
  key: 'run' | 'stations' | 'roxzone';
  label: string;
  sec: number;
  /** Fracción del total (0-1) */
  share: number;
}

/** Dónde se va el tiempo: running, estaciones y Roxzone */
export function raceBreakdown(race: HyroxRace): RacePart[] {
  const parts = [
    { key: 'run' as const, label: 'Running', sec: runTotal(race) },
    { key: 'stations' as const, label: 'Estaciones', sec: stationTotal(race) },
    { key: 'roxzone' as const, label: 'Roxzone', sec: roxzoneOf(race) },
  ];
  const whole = sum(parts.map((p) => p.sec)) || 1;
  return parts.map((p) => ({ ...p, share: p.sec / whole }));
}

/** Vuelta más rápida y más lenta (índice 0-7) */
export function runExtremes(race: Pick<HyroxRace, 'runs'>): {
  best: { index: number; sec: number };
  worst: { index: number; sec: number };
} {
  let best = 0;
  let worst = 0;
  race.runs.forEach((v, i) => {
    if (v < race.runs[best]) best = i;
    if (v > race.runs[worst]) worst = i;
  });
  return {
    best: { index: best, sec: race.runs[best] },
    worst: { index: worst, sec: race.runs[worst] },
  };
}

/**
 * Pérdida de ritmo: media de las vueltas 5-8 menos media de las vueltas 1-4, en segundos por km.
 * Positivo = acabaste más lento.
 */
export const runFade = (race: Pick<HyroxRace, 'runs'>): number =>
  sum(race.runs.slice(4)) / 4 - sum(race.runs.slice(0, 4)) / 4;

/** Estación en la que más tiempo se pasó */
export function slowestStation(race: Pick<HyroxRace, 'stations'>): { index: number; sec: number } {
  let worst = 0;
  race.stations.forEach((v, i) => {
    if (v > race.stations[worst]) worst = i;
  });
  return { index: worst, sec: race.stations[worst] };
}

const pct = (share: number): string => `${Math.round(share * 100)} %`;

/** Conclusiones en lenguaje natural para la ficha de la carrera */
export function raceInsights(race: HyroxRace): string[] {
  const [run, , rox] = raceBreakdown(race);
  const { best, worst } = runExtremes(race);
  const fade = Math.round(runFade(race));
  const slow = slowestStation(race);
  const out = [
    `Corriste ${fmtDuration(run.sec)} (${pct(run.share)} del total) a una media de ${fmtPace(avgRun(race))}.`,
    `Tu vuelta más rápida fue la ${best.index + 1} (${fmtTime(best.sec)}) y la más lenta la ${worst.index + 1} (${fmtTime(worst.sec)}).`,
  ];
  if (fade > 5)
    out.push(`En la segunda mitad perdiste ${fmtTime(fade)} por km respecto a la primera.`);
  else if (fade < -5)
    out.push(`Acabaste más fuerte: la segunda mitad fue ${fmtTime(-fade)} por km más rápida.`);
  else out.push('Mantuviste el ritmo de running de principio a fin.');
  out.push(
    `La estación más larga fue ${RACE_STATIONS[slow.index].label} (${fmtTime(slow.sec)}).`,
    `En la Roxzone pasaste ${fmtTime(rox.sec)} (${pct(rox.share)} del total).`,
  );
  return out;
}

export interface SegmentDelta {
  label: string;
  kind: 'run' | 'station' | 'roxzone' | 'total';
  /** Tiempo en esta carrera y en la comparada */
  sec: number;
  otherSec: number;
  /** sec − otherSec: negativo = más rápido en esta carrera */
  delta: number;
}

/** Diferencias tramo a tramo entre una carrera y otra, más Roxzone y total */
export function compareRaces(race: HyroxRace, other: HyroxRace): SegmentDelta[] {
  const a = raceSegments(race);
  const b = raceSegments(other);
  const rows: SegmentDelta[] = a.map((s, i) => ({
    label: s.label,
    kind: s.kind,
    sec: s.sec,
    otherSec: b[i].sec,
    delta: s.sec - b[i].sec,
  }));
  const rox = { sec: roxzoneOf(race), otherSec: roxzoneOf(other) };
  const tot = { sec: race.totalSec, otherSec: other.totalSec };
  return [
    ...rows,
    { label: 'Roxzone', kind: 'roxzone', ...rox, delta: rox.sec - rox.otherSec },
    { label: 'Total', kind: 'total', ...tot, delta: tot.sec - tot.otherSec },
  ];
}

export interface GapPoint {
  /** «Salida», «Tras SkiErg»… */
  label: string;
  /** Etiqueta corta del eje */
  short: string;
  /** Ventaja acumulada en segundos: positivo = por delante de la otra carrera */
  gap: number;
}

/**
 * Ventaja acumulada tramo a tramo sobre otra carrera, como en un gráfico de diferencias de una
 * carrera de coches: empieza en 0 y el último punto («Meta») es la diferencia de tiempo oficial
 * (incluye la Roxzone, que no se conoce tramo a tramo).
 */
export function raceGap(race: HyroxRace, other: HyroxRace): GapPoint[] {
  const theirs = raceSegments(other);
  let acc = 0;
  return [
    { label: 'Salida', short: 'Salida', gap: 0 },
    ...raceSegments(race).map((s, i) => {
      acc += theirs[i].sec - s.sec;
      return { label: `Tras ${s.label}`, short: s.short, gap: acc };
    }),
    { label: 'Meta (con la Roxzone)', short: 'Meta', gap: other.totalSec - race.totalSec },
  ];
}

export interface BlockTrend {
  race: HyroxRace;
  /** Diferencia con la primera carrera en cada bloque: negativo = más rápido */
  run: number;
  stations: number;
  roxzone: number;
}

/** Running, estaciones y Roxzone de cada carrera frente a la primera, de la más antigua a la más reciente */
export function blockTrend(list: readonly HyroxRace[]): BlockTrend[] {
  const sorted = [...list].sort(
    (a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt),
  );
  if (!sorted.length) return [];
  const [run0, st0, rox0] = raceBreakdown(sorted[0]);
  return sorted.map((race) => {
    const [run, st, rox] = raceBreakdown(race);
    return {
      race,
      run: run.sec - run0.sec,
      stations: st.sec - st0.sec,
      roxzone: rox.sec - rox0.sec,
    };
  });
}

/** Carreras de la más reciente a la más antigua */
export const sortRaces = (list: readonly HyroxRace[]): HyroxRace[] =>
  [...list].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

/** Carrera anterior de la misma división (la referencia natural para comparar) */
export function previousRace(race: HyroxRace, list: readonly HyroxRace[]): HyroxRace | null {
  return (
    sortRaces(list).find(
      (r) => r.id !== race.id && r.division === race.division && r.date < race.date,
    ) ?? null
  );
}

export interface RaceCard {
  race: HyroxRace;
  /** Mejor tiempo de su división */
  isPB: boolean;
  /** Diferencia con la carrera anterior de la misma división (null si es la primera) */
  deltaPrev: number | null;
}

/** Carreras con su contexto (PB y mejora), de la más reciente a la más antigua */
export function raceCards(list: readonly HyroxRace[]): RaceCard[] {
  const best = new Map<string, number>();
  for (const r of list)
    best.set(r.division, Math.min(best.get(r.division) ?? Infinity, r.totalSec));
  return sortRaces(list).map((race) => {
    const prev = previousRace(race, list);
    return {
      race,
      isPB: list.length > 1 && best.get(race.division) === race.totalSec,
      deltaPrev: prev ? race.totalSec - prev.totalSec : null,
    };
  });
}

export interface RacesSummary {
  count: number;
  best: HyroxRace | null;
  /** Mejora desde la primera carrera de la división de la mejor marca (segundos ganados) */
  improvement: number;
}

export function racesSummary(list: readonly HyroxRace[]): RacesSummary {
  if (!list.length) return { count: 0, best: null, improvement: 0 };
  const best = list.reduce((b, r) => (r.totalSec < b.totalSec ? r : b));
  const sameDiv = list.filter((r) => r.division === best.division);
  const first = sameDiv.reduce((f, r) => (r.date < f.date ? r : f));
  return { count: list.length, best, improvement: Math.max(0, first.totalSec - best.totalSec) };
}

export interface TrainingComparison {
  label: string;
  detail: string;
  /** Tiempo en carrera (para el running, la vuelta más rápida) */
  raceSec: number;
  /** Mejor test de entrenamiento equivalente */
  trainingSec: number;
  trainingDate: string;
}

/** Carrera frente a los mejores tests de la pantalla Hyrox en las mismas distancias */
export function trainingComparison(
  race: HyroxRace,
  tests: readonly HyroxTest[],
): TrainingComparison[] {
  const bestTest = (station: string, param: number) =>
    tests
      .filter((t) => t.station === station && t.param === param)
      .reduce<HyroxTest | null>((b, t) => (!b || t.totalSec < b.totalSec ? t : b), null);
  const out: TrainingComparison[] = [];
  const run = bestTest('Running', 1000);
  if (run)
    out.push({
      label: 'Running',
      detail: 'mejor vuelta de 1 km',
      raceSec: runExtremes(race).best.sec,
      trainingSec: run.totalSec,
      trainingDate: run.date,
    });
  RACE_STATIONS.forEach((st, i) => {
    const t = st.training && bestTest(st.training.station, st.training.param);
    if (t)
      out.push({
        label: st.label,
        detail: st.detail,
        raceSec: race.stations[i],
        trainingSec: t.totalSec,
        trainingDate: t.date,
      });
  });
  return out;
}

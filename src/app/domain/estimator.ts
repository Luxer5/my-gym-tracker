import { HyroxRace } from '../core/models';
import { RACE_LAPS, RACE_STATIONS, roxzoneOf, runTotal } from './race';

/**
 * Estimador de tiempo: parte de una carrera (por defecto la última) y el usuario ajusta con
 * deslizadores el running total, la Roxzone y cada estación. El total estimado es la suma.
 */
export interface EstimatorValues {
  /** Running total (8 × 1 km), en segundos */
  run: number;
  /** Roxzone total, en segundos */
  rox: number;
  /** Las 8 estaciones en orden de carrera, en segundos */
  stations: number[];
}

export const valuesFromRace = (race: HyroxRace): EstimatorValues => ({
  run: runTotal(race),
  rox: roxzoneOf(race),
  stations: [...race.stations],
});

export interface SliderRange {
  min: number;
  max: number;
  step: number;
}

/**
 * Margen de cada deslizador respecto a la carrera de partida: el running cambia poco de una carrera
 * a otra, la Roxzone y las estaciones mucho más (técnica, transiciones)
 */
export const RANGE_FACTORS = {
  run: [0.8, 1.15],
  rox: [0.4, 1.5],
  station: [0.6, 1.3],
} as const;

export function sliderRange(
  base: number,
  [lo, hi]: readonly [number, number],
  step = 1,
): SliderRange {
  const min = Math.max(step, Math.floor((base * lo) / step) * step);
  return { min, max: Math.max(min + step, Math.ceil((base * hi) / step) * step), step };
}

export interface Estimate {
  total: number;
  run: number;
  rox: number;
  stations: number;
  /** Ritmo medio de running, en segundos por km */
  pace: number;
}

export function estimate(v: EstimatorValues): Estimate {
  const stations = v.stations.reduce((s, x) => s + x, 0);
  return {
    total: v.run + v.rox + stations,
    run: v.run,
    rox: v.rox,
    stations,
    pace: v.run / RACE_LAPS,
  };
}

/**
 * Diferencia entre el tiempo oficial y la suma de tramos de la carrera (redondeos al segundo).
 * Se suma a la estimación para que, sin tocar nada, salga exactamente el tiempo oficial.
 */
export const baseAdjustment = (race: HyroxRace): number =>
  race.totalSec - estimate(valuesFromRace(race)).total;

export interface EstimateRow {
  label: string;
  base: number;
  value: number;
  /** value − base: negativo = más rápido que en la carrera de partida */
  delta: number;
}

/** Tramo a tramo: running, cada estación y Roxzone, frente a la carrera de partida */
export function estimateRows(base: EstimatorValues, v: EstimatorValues): EstimateRow[] {
  const row = (label: string, b: number, x: number): EstimateRow => ({
    label,
    base: b,
    value: x,
    delta: x - b,
  });
  return [
    row('Running', base.run, v.run),
    ...RACE_STATIONS.map((st, i) => row(st.label, base.stations[i], v.stations[i])),
    row('Roxzone', base.rox, v.rox),
  ];
}

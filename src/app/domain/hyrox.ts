import { HyroxTest } from '../core/models';

export const HYROX_STATIONS = [
  'SkiErg',
  'RowErg',
  'Sled Push',
  'Sled Pull',
  "Farmer's Carry",
  'Sandbag Lunges',
  'Wall Balls',
  'Burpee Broad Jump',
  'Running',
  'Otro',
] as const;
export type HyroxStation = (typeof HYROX_STATIONS)[number];

/** Estación con nombre libre (el nombre escrito pasa a ser la estación) */
export const CUSTOM_STATION: HyroxStation = 'Otro';

/** Qué parámetro se registra en cada estación: distancia, peso o nada */
export type StationConfig =
  | { kind: 'distance'; presets: readonly number[]; unit: string }
  | { kind: 'weight'; presets: readonly number[]; unit: string }
  | { kind: 'none' };

export const STATION_CONFIG: Record<HyroxStation, StationConfig> = {
  SkiErg: { kind: 'distance', presets: [500, 1000, 2000], unit: 'm' },
  RowErg: { kind: 'distance', presets: [500, 1000, 2000], unit: 'm' },
  Running: { kind: 'distance', presets: [400, 1000, 5000], unit: 'm' },
  'Sled Push': { kind: 'weight', presets: [60, 80, 102, 125, 152], unit: 'kg' },
  'Sled Pull': { kind: 'weight', presets: [60, 80, 102, 125, 152], unit: 'kg' },
  "Farmer's Carry": { kind: 'weight', presets: [16, 20, 24, 32], unit: 'kg/mano' },
  'Sandbag Lunges': { kind: 'weight', presets: [10, 15, 20, 24, 30], unit: 'kg' },
  'Wall Balls': { kind: 'weight', presets: [4, 6, 9, 10], unit: 'kg' },
  'Burpee Broad Jump': { kind: 'none' },
  Otro: { kind: 'none' },
};

/** Configuración de una estación (las de nombre libre no tienen parámetro) */
export const stationConfig = (station: string): StationConfig =>
  STATION_CONFIG[station as HyroxStation] ?? { kind: 'none' };

/** Texto del parámetro de un test: «1000 m», «24 kg/mano» o vacío */
export function paramLabel(t: Pick<HyroxTest, 'station' | 'param'>): string {
  const cfg = stationConfig(t.station);
  return cfg.kind === 'none' || t.param == null ? '' : `${t.param} ${cfg.unit}`;
}

/** Los tests de la misma estación con el mismo parámetro se comparan entre sí */
export const groupKey = (t: Pick<HyroxTest, 'station' | 'param'>): string => {
  const label = paramLabel(t);
  return label ? `${t.station}|${label}` : t.station;
};

export interface HyroxGroup {
  key: string;
  station: string;
  kind: StationConfig['kind'];
  paramLabel: string;
  /** Del mejor tiempo al peor */
  entries: HyroxTest[];
  best: HyroxTest;
  /** Segundos ganados desde el primer test (por fecha) hasta el mejor; 0 si no hay mejora */
  improvement: number;
  /** Hay más de un test con el que compararse */
  hasPB: boolean;
}

/** Tests agrupados por estación y parámetro, ordenados por estación y luego por parámetro */
export function hyroxGroups(list: readonly HyroxTest[]): HyroxGroup[] {
  const map = new Map<string, HyroxTest[]>();
  for (const t of list) {
    const k = groupKey(t);
    map.set(k, [...(map.get(k) ?? []), t]);
  }
  return [...map.entries()]
    .map(([key, tests]): HyroxGroup => {
      const entries = [...tests].sort((a, b) => a.totalSec - b.totalSec);
      const best = entries[0];
      const first = tests.reduce((f, t) => (t.date < f.date ? t : f));
      return {
        key,
        station: best.station,
        kind: stationConfig(best.station).kind,
        paramLabel: paramLabel(best),
        entries,
        best,
        improvement: Math.max(0, first.totalSec - best.totalSec),
        hasPB: tests.length > 1,
      };
    })
    .sort((a, b) =>
      a.station !== b.station
        ? a.station.localeCompare(b.station)
        : (a.best.param ?? 0) - (b.best.param ?? 0),
    );
}

export interface HyroxSummary {
  tests: number;
  stations: number;
  combos: number;
}

/** Cifras de la cabecera: tests, estaciones distintas y combinaciones estación + parámetro */
export const hyroxSummary = (list: readonly HyroxTest[]): HyroxSummary => ({
  tests: list.length,
  stations: new Set(list.map((t) => t.station)).size,
  combos: new Set(list.map(groupKey)).size,
});

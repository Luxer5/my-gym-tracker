import { Exercise, HyroxRace, HyroxTest, LiftRecord, RECORD_TYPES, RecordType } from '../models';

/**
 * Documentos leídos de la base de datos → modelos de la app. Los datos antiguos (o escritos a mano)
 * pueden traer campos ausentes o de otro tipo: aquí se completan para que la interfaz no falle.
 */
type Raw = Record<string, unknown> & { id: string };

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const numOr = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

export const toExercise = (d: Raw): Exercise => ({
  id: d.id,
  name: str(d['name'], 'Sin nombre'),
  category: str(d['category'], 'Otro'),
  unit: d['unit'] === 'lb' ? 'lb' : 'kg',
  createdAt: str(d['createdAt']),
});

export const toRecord = (d: Raw): LiftRecord => ({
  id: d.id,
  type: (RECORD_TYPES as readonly string[]).includes(str(d['type']))
    ? (d['type'] as RecordType)
    : 'PR',
  value: numOr(d['value'], 0),
  date: str(d['date']),
  note: str(d['note']),
});

/** Lista de 8 tiempos (los que falten o no sean números, 0) */
const laps = (v: unknown): number[] =>
  Array.from({ length: 8 }, (_, i) => (Array.isArray(v) ? numOr(v[i], 0) : 0));
const numOrNull = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

export const toRace = (d: Raw): HyroxRace => ({
  id: d.id,
  event: str(d['event'], 'Carrera HYROX'),
  date: str(d['date']),
  division: str(d['division']),
  ageGroup: str(d['ageGroup']),
  athlete: str(d['athlete']),
  runs: laps(d['runs']),
  stations: laps(d['stations']),
  roxzoneSec: numOrNull(d['roxzoneSec']),
  totalSec: numOr(d['totalSec'], 0),
  rankOverall: numOrNull(d['rankOverall']),
  rankAgeGroup: numOrNull(d['rankAgeGroup']),
  note: str(d['note']),
  createdAt: str(d['createdAt']),
});

export const toHyrox = (d: Raw): HyroxTest => ({
  id: d.id,
  station: str(d['station'], 'Otro'),
  param: typeof d['param'] === 'number' ? d['param'] : null,
  totalSec: numOr(d['totalSec'], 0),
  date: str(d['date']),
  note: str(d['note']),
});

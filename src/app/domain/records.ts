import { ExerciseWithRecords, LiftRecord, RECORD_TYPES, RecordType } from '../core/models';

/** Etiquetas de cada tipo de registro (formulario y tarjeta) */
export const RECORD_META: Record<RecordType, { label: string; sub: string; formSub: string }> = {
  PR: { label: 'PR', sub: '1 rep máx.', formSub: 'Peso máximo · 1 rep' },
  '1RM': { label: '1RM', sub: '1 rep', formSub: '1 repetición' },
  '3RM': { label: '3RM', sub: '3 reps', formSub: '3 repeticiones' },
  '5RM': { label: '5RM', sub: '5 reps', formSub: '5 repeticiones' },
};

/** Mejor registro (mayor peso) de un tipo; null si no hay ninguno */
export function bestOfType(records: readonly LiftRecord[], type: RecordType): LiftRecord | null {
  let best: LiftRecord | null = null;
  for (const r of records) if (r.type === type && (!best || r.value > best.value)) best = r;
  return best;
}

export interface RecordBox {
  type: RecordType;
  label: string;
  sub: string;
  best: LiftRecord | null;
  isPR: boolean;
}

/** Las cuatro casillas de la tarjeta de un ejercicio: el mejor registro de cada tipo */
export const recordBoxes = (records: readonly LiftRecord[]): RecordBox[] =>
  RECORD_TYPES.map((type) => ({
    type,
    label: RECORD_META[type].label,
    sub: RECORD_META[type].sub,
    best: bestOfType(records, type),
    isPR: type === 'PR',
  }));

/** Registros del más reciente al más antiguo (a igual fecha, el orden de entrada se mantiene) */
export const byDateDesc = (records: readonly LiftRecord[]): LiftRecord[] =>
  [...records].sort((a, b) => b.date.localeCompare(a.date));

/** Fecha del último registro (null si no hay) */
export const lastRecordDate = (records: readonly LiftRecord[]): string | null =>
  records.reduce<string | null>((m, r) => (!m || r.date > m ? r.date : m), null);

export interface GymSummary {
  exercises: number;
  prs: number;
  rms: number;
}

/** Cifras de la cabecera: ejercicios, registros PR y registros RM */
export function gymSummary(list: readonly ExerciseWithRecords[]): GymSummary {
  const all = list.flatMap((e) => e.records);
  const prs = all.filter((r) => r.type === 'PR').length;
  return { exercises: list.length, prs, rms: all.length - prs };
}

/** Filtro «todos» de la lista de ejercicios */
export const ALL = 'all';

/** Categorías presentes, en orden de aparición, precedidas de «todos» */
export const categoryFilters = (list: readonly ExerciseWithRecords[]): string[] => [
  ALL,
  ...new Set(list.map((e) => e.category)),
];

export const filterByCategory = (
  list: readonly ExerciseWithRecords[],
  category: string,
): ExerciseWithRecords[] =>
  category === ALL ? [...list] : list.filter((e) => e.category === category);

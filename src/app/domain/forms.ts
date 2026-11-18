import {
  EXERCISE_CATEGORIES,
  Exercise,
  ExercisePatch,
  NewExercise,
  NewHyroxTest,
  NewLiftRecord,
  RECORD_TYPES,
  RecordType,
  WEIGHT_UNITS,
  WeightUnit,
} from '../core/models';
import { num, todayIso } from './format';
import { CUSTOM_STATION, HYROX_STATIONS, stationConfig } from './hyrox';

/** Resultado de validar un formulario: los datos listos para guardar o el mensaje de error */
export type FormResult<T> = { ok: true; data: T } | { ok: false; error: string };

const fail = <T>(error: string): FormResult<T> => ({ ok: false, error });

/** Valor «Otro…» del desplegable de distancia/peso: se escribe a mano */
export const OTHER_PRESET = 'otro';

// ── Ejercicio ──

export interface ExerciseForm {
  name: string;
  category: string;
  unit: string;
}

export const emptyExerciseForm = (): ExerciseForm => ({
  name: '',
  category: EXERCISE_CATEGORIES[0],
  unit: WEIGHT_UNITS[0],
});

/** Formulario relleno con un ejercicio que ya existe (para editarlo) */
export const exerciseToForm = (ex: Exercise): ExerciseForm => ({
  name: ex.name,
  category: ex.category,
  unit: ex.unit,
});

/** Nombre y categoría validados: comunes al alta y a la edición */
function exerciseFields(f: ExerciseForm): FormResult<ExercisePatch> {
  const name = f.name.trim();
  if (!name) return fail('Escribe el nombre del ejercicio.');
  if (name.length > 100) return fail('El nombre no puede pasar de 100 caracteres.');
  const category = f.category || EXERCISE_CATEGORIES[EXERCISE_CATEGORIES.length - 1];
  return { ok: true, data: { name, category } };
}

export function formToExercise(f: ExerciseForm, now: Date = new Date()): FormResult<NewExercise> {
  const res = exerciseFields(f);
  if (!res.ok) return res;
  const unit = (WEIGHT_UNITS as readonly string[]).includes(f.unit)
    ? (f.unit as WeightUnit)
    : WEIGHT_UNITS[0];
  return { ok: true, data: { ...res.data, unit, createdAt: now.toISOString() } };
}

/** Cambios de un ejercicio ya creado: nombre y categoría (la unidad no se toca) */
export const formToExercisePatch = (f: ExerciseForm): FormResult<ExercisePatch> =>
  exerciseFields(f);

// ── Registro de un ejercicio ──

export interface RecordForm {
  type: RecordType;
  value: string;
  date: string;
  note: string;
}

export const emptyRecordForm = (now: Date = new Date()): RecordForm => ({
  type: 'PR',
  value: '',
  date: todayIso(now),
  note: '',
});

export function formToRecord(f: RecordForm, now: Date = new Date()): FormResult<NewLiftRecord> {
  if (!RECORD_TYPES.includes(f.type)) return fail('Elige el tipo de registro.');
  const value = num(f.value);
  if (value === undefined || value <= 0) return fail('Introduce el peso.');
  if (value > 2000) return fail('El peso no parece válido.');
  return {
    ok: true,
    data: { type: f.type, value, date: f.date || todayIso(now), note: f.note.trim() },
  };
}

// ── Test Hyrox ──

export interface HyroxForm {
  station: string;
  /** Valor del desplegable de distancia/peso (un preset u OTHER_PRESET) */
  preset: string;
  /** Distancia/peso escrito a mano (preset = OTHER_PRESET) */
  custom: string;
  /** Nombre de la estación cuando es «Otro» */
  customName: string;
  min: string;
  sec: string;
  date: string;
  note: string;
}

/** Preset inicial de una estación: el primero de su lista (vacío si no tiene parámetro) */
export const defaultPreset = (station: string): string => {
  const cfg = stationConfig(station);
  return cfg.kind === 'none' ? '' : String(cfg.presets[0]);
};

export const emptyHyroxForm = (now: Date = new Date()): HyroxForm => ({
  station: HYROX_STATIONS[0],
  preset: defaultPreset(HYROX_STATIONS[0]),
  custom: '',
  customName: '',
  min: '',
  sec: '',
  date: todayIso(now),
  note: '',
});

export function formToHyrox(f: HyroxForm, now: Date = new Date()): FormResult<NewHyroxTest> {
  const cfg = stationConfig(f.station);
  const station = f.station === CUSTOM_STATION ? f.customName.trim() || CUSTOM_STATION : f.station;
  if (station.length > 100) return fail('El nombre no puede pasar de 100 caracteres.');

  let param: number | null = null;
  if (cfg.kind !== 'none') {
    const v = num(f.preset === OTHER_PRESET ? f.custom : f.preset);
    if (cfg.kind === 'distance' && (v === undefined || v <= 0))
      return fail('Introduce la distancia.');
    if (cfg.kind === 'weight' && (v === undefined || v < 0)) return fail('Introduce el peso.');
    param = v!;
  }

  const min = num(f.min) ?? 0;
  const sec = num(f.sec) ?? 0;
  if (min < 0 || sec < 0 || !Number.isInteger(min) || !Number.isInteger(sec))
    return fail('El tiempo no es válido.');
  if (sec > 59) return fail('Los segundos van de 0 a 59.');
  if (!min && !sec) return fail('Introduce el tiempo.');

  return {
    ok: true,
    data: {
      station,
      param,
      totalSec: min * 60 + sec,
      date: f.date || todayIso(now),
      note: f.note.trim(),
    },
  };
}

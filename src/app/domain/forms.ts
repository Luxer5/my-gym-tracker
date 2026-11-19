import {
  EXERCISE_CATEGORIES,
  Exercise,
  ExercisePatch,
  NewExercise,
  NewHyroxTest,
  NewLiftRecord,
  NewRunTest,
  RECORD_TYPES,
  RecordType,
  RunTestKind,
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

// ── Test de carrera (VAM / Jim Vance 30') ──

export interface RunTestForm {
  kind: RunTestKind;
  /** VAM: metros recorridos en 6 minutos */
  distance: string;
  /** Jim Vance: ritmo medio por km (minutos y segundos) */
  paceMin: string;
  paceSec: string;
  /** Jim Vance: FC media de los últimos 20' (opcional) */
  lthr: string;
  /** Jim Vance: potencia media de los 30' (opcional) */
  power: string;
  date: string;
  note: string;
}

export const emptyRunTestForm = (kind: RunTestKind, now: Date = new Date()): RunTestForm => ({
  kind,
  distance: '',
  paceMin: '',
  paceSec: '',
  lthr: '',
  power: '',
  date: todayIso(now),
  note: '',
});

/** Distancias admitidas en 6 minutos: por debajo, seguramente se ha escrito en km */
const VAM_MIN_M = 200;
const VAM_MAX_M = 3000;

export function formToRunTest(f: RunTestForm, now: Date = new Date()): FormResult<NewRunTest> {
  const base = { date: f.date || todayIso(now), note: f.note.trim() };

  if (f.kind === 'vam') {
    const d = num(f.distance);
    if (d === undefined || d <= 0) return fail('Introduce la distancia en metros.');
    if (d < VAM_MIN_M) return fail('La distancia va en metros (p. ej. 1400).');
    if (d > VAM_MAX_M) return fail(`En 6 minutos no se pasa de ${VAM_MAX_M} m.`);
    return {
      ok: true,
      data: { kind: 'vam', distanceM: d, paceSec: null, lthr: null, powerW: null, ...base },
    };
  }

  const min = num(f.paceMin) ?? 0;
  const sec = num(f.paceSec) ?? 0;
  if (min < 0 || sec < 0 || !Number.isInteger(min) || !Number.isInteger(sec))
    return fail('El ritmo no es válido.');
  if (sec > 59) return fail('Los segundos van de 0 a 59.');
  if (!min && !sec) return fail('Introduce el ritmo medio por km.');
  const paceSec = min * 60 + sec;
  if (paceSec < 120) return fail('El ritmo va por kilómetro (p. ej. 5:47).');

  const lthr = num(f.lthr);
  if (lthr !== undefined && (!Number.isInteger(lthr) || lthr < 60 || lthr > 240))
    return fail('La FC media va de 60 a 240 lpm.');
  const power = num(f.power);
  if (power !== undefined && (power <= 0 || power > 1000))
    return fail('La potencia va de 1 a 1000 W.');

  return {
    ok: true,
    data: {
      kind: 'vance30',
      distanceM: null,
      paceSec,
      lthr: lthr ?? null,
      powerW: power ?? null,
      ...base,
    },
  };
}

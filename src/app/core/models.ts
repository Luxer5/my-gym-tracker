/**
 * Tipos de los datos de Firestore. Todo cuelga de users/{uid}:
 *   exercises/{id}                 → Exercise
 *   exercises/{id}/records/{id}    → LiftRecord
 *   hyrox/{id}                     → HyroxTest
 *   runTests/{id}                  → RunTest
 *   races/{id}                     → HyroxRace
 * Las fechas son ISO `YYYY-MM-DD` (día local de quien registra).
 */

/** Usuario con sesión iniciada */
export interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

// ── Gym ──

export const EXERCISE_CATEGORIES = [
  'Piernas',
  'Empuje',
  'Jalón',
  'Hombros',
  'Core',
  'Full body',
  'Cardio',
  'Otro',
] as const;
export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

export const WEIGHT_UNITS = ['kg', 'lb'] as const;
export type WeightUnit = (typeof WEIGHT_UNITS)[number];

/** PR = peso máximo a 1 rep; nRM = peso máximo a n repeticiones */
export const RECORD_TYPES = ['PR', '1RM', '3RM', '5RM'] as const;
export type RecordType = (typeof RECORD_TYPES)[number];

export interface Exercise {
  id: string;
  name: string;
  /** Una de EXERCISE_CATEGORIES (texto libre en datos antiguos) */
  category: string;
  unit: WeightUnit;
  /** Instante de alta (ISO completo): ordena la lista */
  createdAt: string;
}
export type NewExercise = Omit<Exercise, 'id'>;
/** Lo que se puede cambiar de un ejercicio ya creado (la unidad no: reinterpretaría sus registros) */
export type ExercisePatch = Pick<Exercise, 'name' | 'category'>;

export interface LiftRecord {
  id: string;
  type: RecordType;
  /** Peso levantado, en la unidad del ejercicio */
  value: number;
  date: string;
  note?: string;
}
export type NewLiftRecord = Omit<LiftRecord, 'id'>;

/** Ejercicio con sus registros (los registros son una subcolección en Firestore) */
export interface ExerciseWithRecords extends Exercise {
  records: LiftRecord[];
}

// ── Hyrox ──

export interface HyroxTest {
  id: string;
  /** Estación de HYROX_STATIONS o nombre libre (estación «Otro») */
  station: string;
  /** Distancia (m) o peso según la estación; null si la estación no lo usa */
  param: number | null;
  /** Tiempo total en segundos */
  totalSec: number;
  date: string;
  note?: string;
}
export type NewHyroxTest = Omit<HyroxTest, 'id'>;

// ── Tests de carrera (zonas de entrenamiento) ──

/** vam = máxima distancia en 6 minutos; vance30 = test de Jim Vance de 30 minutos */
export const RUN_TEST_KINDS = ['vam', 'vance30'] as const;
export type RunTestKind = (typeof RUN_TEST_KINDS)[number];

export interface RunTest {
  id: string;
  kind: RunTestKind;
  /** VAM: metros recorridos en los 6 minutos; null en el test de Jim Vance */
  distanceM: number | null;
  /** Jim Vance: ritmo medio de los 30 minutos, en segundos por km (FTPa); null en el VAM */
  paceSec: number | null;
  /** Jim Vance: frecuencia cardiaca media de los últimos 20 minutos (LTHR); null si no se midió */
  lthr: number | null;
  /** Jim Vance: potencia media de los 30 minutos en W (rFTP, Stryd); null si no se midió */
  powerW: number | null;
  date: string;
  note?: string;
}
export type NewRunTest = Omit<RunTest, 'id'>;

// ── Carreras HYROX (resultados oficiales importados) ──

/** Una carrera HYROX completa: 8 × (1 km de running + estación), más la Roxzone */
export interface HyroxRace {
  id: string;
  /** Nombre de la carrera: «HYROX Madrid» */
  event: string;
  date: string;
  /** División oficial: «HYROX Men», «HYROX PRO Women», «HYROX Doubles Mixed»… */
  division: string;
  /** Grupo de edad: «30-34» */
  ageGroup: string;
  /** Nombre tal como sale en el resultado */
  athlete: string;
  /** Las 8 vueltas de 1 km, en segundos */
  runs: number[];
  /** Las 8 estaciones en orden de carrera (SkiErg → Wall Balls), en segundos */
  stations: number[];
  /** Tiempo total en las zonas de transición; null si no se conoce */
  roxzoneSec: number | null;
  totalSec: number;
  /** Posición en la clasificación de la división (Rank M/W) */
  rankOverall: number | null;
  /** Posición en el grupo de edad (Rank AG) */
  rankAgeGroup: number | null;
  note?: string;
  createdAt: string;
}
export type NewHyroxRace = Omit<HyroxRace, 'id'>;

import { Observable } from 'rxjs';
import {
  Exercise,
  ExercisePatch,
  HyroxRace,
  HyroxTest,
  LiftRecord,
  NewExercise,
  NewHyroxRace,
  NewHyroxTest,
  NewLiftRecord,
} from '../models';

/**
 * Acceso a los datos del usuario con sesión iniciada (users/{uid}/…).
 * Implementaciones: Firestore (producción) y memoria (demo, tests y E2E).
 */
export abstract class TrainingRepository {
  // ── Suscripciones en tiempo real ──
  /** Ejercicios por fecha de alta (sin sus registros) */
  abstract watchExercises(): Observable<Exercise[]>;
  /** Registros de un ejercicio, del más reciente al más antiguo */
  abstract watchRecords(exerciseId: string): Observable<LiftRecord[]>;
  /** Tests Hyrox, del más reciente al más antiguo */
  abstract watchHyrox(): Observable<HyroxTest[]>;
  /** Carreras HYROX, de la más reciente a la más antigua */
  abstract watchRaces(): Observable<HyroxRace[]>;

  // ── Ejercicios y sus registros ──
  abstract addExercise(data: NewExercise): Promise<string>;
  /** Cambia el nombre o la categoría; los registros no se tocan */
  abstract updateExercise(id: string, patch: ExercisePatch): Promise<void>;
  /** Borra el ejercicio y todos sus registros */
  abstract deleteExercise(id: string): Promise<void>;
  abstract addRecord(exerciseId: string, data: NewLiftRecord): Promise<string>;
  abstract deleteRecord(exerciseId: string, recordId: string): Promise<void>;

  // ── Hyrox ──
  abstract addHyrox(data: NewHyroxTest): Promise<string>;
  abstract deleteHyrox(id: string): Promise<void>;

  // ── Carreras ──
  abstract addRace(data: NewHyroxRace): Promise<string>;
  abstract deleteRace(id: string): Promise<void>;
}

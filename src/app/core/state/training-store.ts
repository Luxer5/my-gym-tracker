import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthGateway } from '../auth/auth-gateway';
import { TrainingRepository } from '../data/training-repository';
import {
  Exercise,
  ExerciseWithRecords,
  HyroxRace,
  HyroxTest,
  LiftRecord,
  RunTest,
} from '../models';

// Un fallo de una suscripción (p. ej. permisos al cerrar sesión) no rompe la aplicación
const onError = (e: unknown) =>
  console.warn(
    '[firestore] Error en la suscripción:',
    (e as { code?: string })?.code,
    (e as Error)?.message,
  );

/**
 * Estado global de la sesión: ejercicios (con sus registros) y tests Hyrox en tiempo real.
 * Se rellena al iniciar sesión y se vacía al cerrarla.
 *
 * Los registros son una subcolección de cada ejercicio: hay una suscripción por ejercicio, que se
 * abre cuando aparece el ejercicio y se cierra cuando desaparece.
 */
@Injectable({ providedIn: 'root' })
export class TrainingStore {
  private readonly auth = inject(AuthGateway);
  private readonly repo = inject(TrainingRepository);

  readonly user = this.auth.user;

  private readonly exerciseList = signal<Exercise[]>([]);
  private readonly recordsById = signal<ReadonlyMap<string, LiftRecord[]>>(new Map());
  readonly exercisesLoaded = signal(false);

  /** Ejercicios con sus registros (los registros, del más reciente al más antiguo) */
  readonly exercises = computed<ExerciseWithRecords[]>(() => {
    const recs = this.recordsById();
    return this.exerciseList().map((e) => ({ ...e, records: recs.get(e.id) ?? [] }));
  });

  readonly hyrox = signal<HyroxTest[]>([]);
  readonly hyroxLoaded = signal(false);

  /** Tests de carrera (VAM, Jim Vance), del más reciente al más antiguo */
  readonly runTests = signal<RunTest[]>([]);
  readonly runTestsLoaded = signal(false);

  /** Carreras HYROX importadas, de la más reciente a la más antigua */
  readonly races = signal<HyroxRace[]>([]);
  readonly racesLoaded = signal(false);

  private subs: Subscription[] = [];
  private readonly recordSubs = new Map<string, Subscription>();

  constructor() {
    // Solo cambia de sesión cuando cambia el uid (Firebase puede repetir el aviso con el mismo usuario)
    const uid = computed(() => {
      const u = this.auth.user();
      return u ? u.uid : u;
    });
    effect(() => {
      const id = uid();
      untracked(() => {
        if (id === undefined) return;
        this.stop();
        if (id !== null) this.start();
      });
    });
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  /** Ejercicio por id (con sus registros) */
  exercise(id: string): ExerciseWithRecords | undefined {
    return this.exercises().find((e) => e.id === id);
  }

  /** Carrera por id */
  race(id: string): HyroxRace | undefined {
    return this.races().find((r) => r.id === id);
  }

  private start(): void {
    this.subs.push(
      this.repo.watchExercises().subscribe({
        next: (list) => {
          this.exerciseList.set(list);
          this.syncRecordSubs(list);
          this.exercisesLoaded.set(true);
        },
        error: onError,
      }),
      this.repo.watchHyrox().subscribe({
        next: (list) => {
          this.hyrox.set(list);
          this.hyroxLoaded.set(true);
        },
        error: onError,
      }),
      this.repo.watchRunTests().subscribe({
        next: (list) => {
          this.runTests.set(list);
          this.runTestsLoaded.set(true);
        },
        error: onError,
      }),
      this.repo.watchRaces().subscribe({
        next: (list) => {
          this.races.set(list);
          this.racesLoaded.set(true);
        },
        error: onError,
      }),
    );
  }

  /** Abre la suscripción de registros de los ejercicios nuevos y cierra la de los borrados */
  private syncRecordSubs(list: readonly Exercise[]): void {
    const ids = new Set(list.map((e) => e.id));
    for (const [id, sub] of this.recordSubs) {
      if (ids.has(id)) continue;
      sub.unsubscribe();
      this.recordSubs.delete(id);
      this.recordsById.update((m) => {
        const next = new Map(m);
        next.delete(id);
        return next;
      });
    }
    for (const id of ids) {
      if (this.recordSubs.has(id)) continue;
      this.recordSubs.set(
        id,
        this.repo.watchRecords(id).subscribe({
          next: (records) => this.recordsById.update((m) => new Map(m).set(id, records)),
          error: onError,
        }),
      );
    }
  }

  private stop(): void {
    this.subs.forEach((s) => s.unsubscribe());
    this.subs = [];
    this.recordSubs.forEach((s) => s.unsubscribe());
    this.recordSubs.clear();
    this.exerciseList.set([]);
    this.recordsById.set(new Map());
    this.exercisesLoaded.set(false);
    this.races.set([]);
    this.racesLoaded.set(false);
    this.hyrox.set([]);
    this.hyroxLoaded.set(false);
    this.runTests.set([]);
    this.runTestsLoaded.set(false);
  }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
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
import { demoData } from './demo-data';
import { TrainingRepository } from './training-repository';

const clone = <T>(v: T): T => structuredClone(v);
const tick = () => new Promise<void>((r) => setTimeout(r, 0));
const byCreated = (a: Exercise, b: Exercise) => a.createdAt.localeCompare(b.createdAt);
const byDateDesc = <T extends { date: string }>(a: T, b: T) => b.date.localeCompare(a.date);

/**
 * Backend en memoria con la misma semántica que Firestore (escrituras asíncronas, notificaciones a
 * los suscriptores y mismo orden). Se usa en la demo, los tests unitarios y los E2E.
 */
@Injectable()
export class MemoryTrainingRepository extends TrainingRepository {
  private readonly exercises$: BehaviorSubject<Exercise[]>;
  private readonly hyrox$: BehaviorSubject<HyroxTest[]>;
  private readonly races$: BehaviorSubject<HyroxRace[]>;
  private readonly records = new Map<string, BehaviorSubject<LiftRecord[]>>();
  private seq = 0;

  constructor() {
    super();
    const data = demoData();
    this.exercises$ = new BehaviorSubject(data.exercises);
    this.hyrox$ = new BehaviorSubject(data.hyrox);
    this.races$ = new BehaviorSubject(data.races);
    for (const [id, list] of Object.entries(data.records))
      this.records.set(id, new BehaviorSubject(list));
  }

  private newId = () => `m${++this.seq}`;

  private recordsOf(exerciseId: string): BehaviorSubject<LiftRecord[]> {
    let s = this.records.get(exerciseId);
    if (!s) this.records.set(exerciseId, (s = new BehaviorSubject<LiftRecord[]>([])));
    return s;
  }

  private watch<T>(s: BehaviorSubject<T[]>, sort: (a: T, b: T) => number): Observable<T[]> {
    return new Observable<T[]>((sub) =>
      s.subscribe((v) => queueMicrotask(() => sub.next(clone(v).sort(sort)))),
    );
  }

  watchExercises = () => this.watch(this.exercises$, byCreated);
  watchRecords = (exerciseId: string) => this.watch(this.recordsOf(exerciseId), byDateDesc);
  watchHyrox = () => this.watch(this.hyrox$, byDateDesc);
  watchRaces = () => this.watch(this.races$, byDateDesc);

  async addRace(data: NewHyroxRace): Promise<string> {
    await tick();
    const id = this.newId();
    this.races$.next([...this.races$.value, { id, ...clone(data) }]);
    return id;
  }

  async deleteRace(id: string): Promise<void> {
    await tick();
    this.races$.next(this.races$.value.filter((r) => r.id !== id));
  }

  async addExercise(data: NewExercise): Promise<string> {
    await tick();
    const id = this.newId();
    this.exercises$.next([...this.exercises$.value, { id, ...clone(data) }]);
    return id;
  }

  async updateExercise(id: string, patch: ExercisePatch): Promise<void> {
    await tick();
    if (!this.exercises$.value.some((e) => e.id === id)) throw new Error('El ejercicio no existe');
    const { name, category } = patch;
    this.exercises$.next(
      this.exercises$.value.map((e) => (e.id === id ? { ...e, name, category } : e)),
    );
  }

  async deleteExercise(id: string): Promise<void> {
    await tick();
    this.records.get(id)?.next([]);
    this.records.delete(id);
    this.exercises$.next(this.exercises$.value.filter((e) => e.id !== id));
  }

  async addRecord(exerciseId: string, data: NewLiftRecord): Promise<string> {
    await tick();
    const id = this.newId();
    const s = this.recordsOf(exerciseId);
    s.next([...s.value, { id, ...clone(data) }]);
    return id;
  }

  async deleteRecord(exerciseId: string, recordId: string): Promise<void> {
    await tick();
    const s = this.recordsOf(exerciseId);
    s.next(s.value.filter((r) => r.id !== recordId));
  }

  async addHyrox(data: NewHyroxTest): Promise<string> {
    await tick();
    const id = this.newId();
    this.hyrox$.next([...this.hyrox$.value, { id, ...clone(data) }]);
    return id;
  }

  async deleteHyrox(id: string): Promise<void> {
    await tick();
    this.hyrox$.next(this.hyrox$.value.filter((t) => t.id !== id));
  }
}

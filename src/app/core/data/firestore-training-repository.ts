import { Injectable, inject } from '@angular/core';
import {
  DocumentData,
  Query,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { AuthGateway } from '../auth/auth-gateway';
import { FIRESTORE } from '../firebase';
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
import { toExercise, toHyrox, toRace, toRecord } from './normalize';
import { TrainingRepository } from './training-repository';

/** Máximo de operaciones por lote de Firestore */
const BATCH_LIMIT = 500;

/** Datos del usuario en Firestore: users/{uid}/{exercises/{id}/records, hyrox, races} */
@Injectable()
export class FirestoreTrainingRepository extends TrainingRepository {
  private readonly db = inject(FIRESTORE);
  private readonly auth = inject(AuthGateway);

  // ── Rutas (siempre con el uid de la sesión) ──
  private exercisesCol = () => collection(this.db, 'users', this.auth.uid(), 'exercises');
  private exerciseDoc = (id: string) => doc(this.db, 'users', this.auth.uid(), 'exercises', id);
  private recordsCol = (exId: string) =>
    collection(this.db, 'users', this.auth.uid(), 'exercises', exId, 'records');
  private recordDoc = (exId: string, recId: string) =>
    doc(this.db, 'users', this.auth.uid(), 'exercises', exId, 'records', recId);
  private hyroxCol = () => collection(this.db, 'users', this.auth.uid(), 'hyrox');
  private hyroxDoc = (id: string) => doc(this.db, 'users', this.auth.uid(), 'hyrox', id);
  private racesCol = () => collection(this.db, 'users', this.auth.uid(), 'races');
  private raceDoc = (id: string) => doc(this.db, 'users', this.auth.uid(), 'races', id);

  private watch<T>(
    q: Query<DocumentData>,
    map: (d: DocumentData & { id: string }) => T,
  ): Observable<T[]> {
    return new Observable<T[]>((sub) =>
      onSnapshot(
        q,
        (snap) => sub.next(snap.docs.map((d) => map({ id: d.id, ...d.data() }))),
        (err) => sub.error(err),
      ),
    );
  }

  watchExercises = (): Observable<Exercise[]> =>
    this.watch(query(this.exercisesCol(), orderBy('createdAt')), toExercise);

  watchRecords = (exerciseId: string): Observable<LiftRecord[]> =>
    this.watch(query(this.recordsCol(exerciseId), orderBy('date', 'desc')), toRecord);

  watchHyrox = (): Observable<HyroxTest[]> =>
    this.watch(query(this.hyroxCol(), orderBy('date', 'desc')), toHyrox);

  watchRaces = (): Observable<HyroxRace[]> =>
    this.watch(query(this.racesCol(), orderBy('date', 'desc')), toRace);

  async addRace(data: NewHyroxRace): Promise<string> {
    return (await addDoc(this.racesCol(), data)).id;
  }

  deleteRace(id: string): Promise<void> {
    return deleteDoc(this.raceDoc(id));
  }

  async addExercise(data: NewExercise): Promise<string> {
    return (await addDoc(this.exercisesCol(), data)).id;
  }

  updateExercise(id: string, patch: ExercisePatch): Promise<void> {
    return updateDoc(this.exerciseDoc(id), { name: patch.name, category: patch.category });
  }

  async deleteExercise(id: string): Promise<void> {
    // Firestore no borra las subcolecciones: primero los registros (por lotes), luego el ejercicio
    const records = await getDocs(this.recordsCol(id));
    const refs = [...records.docs.map((d) => d.ref), this.exerciseDoc(id)];
    for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
      const batch = writeBatch(this.db);
      refs.slice(i, i + BATCH_LIMIT).forEach((r) => batch.delete(r));
      await batch.commit();
    }
  }

  async addRecord(exerciseId: string, data: NewLiftRecord): Promise<string> {
    return (await addDoc(this.recordsCol(exerciseId), data)).id;
  }

  deleteRecord(exerciseId: string, recordId: string): Promise<void> {
    return deleteDoc(this.recordDoc(exerciseId, recordId));
  }

  async addHyrox(data: NewHyroxTest): Promise<string> {
    return (await addDoc(this.hyroxCol(), data)).id;
  }

  deleteHyrox(id: string): Promise<void> {
    return deleteDoc(this.hyroxDoc(id));
  }
}

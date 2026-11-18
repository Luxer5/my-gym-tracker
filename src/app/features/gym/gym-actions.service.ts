import { Injectable, inject } from '@angular/core';
import { TrainingRepository } from '../../core/data/training-repository';
import { ConfirmService } from '../../core/services/confirm.service';
import { NotifyService } from '../../core/services/notify.service';
import { TrainingStore } from '../../core/state/training-store';
import { ExerciseForm, RecordForm, formToExercise, formToRecord } from '../../domain/forms';

/** Casos de uso de Gym. Los métodos que guardan devuelven true si se guardó. */
@Injectable({ providedIn: 'root' })
export class GymActions {
  private readonly repo = inject(TrainingRepository);
  private readonly store = inject(TrainingStore);
  private readonly notify = inject(NotifyService);
  private readonly confirm = inject(ConfirmService);

  /** Ejecuta una escritura con los avisos «Guardando…» / resultado / error */
  private async run(ok: string, fn: () => Promise<unknown>): Promise<boolean> {
    this.notify.status('Guardando…');
    try {
      await fn();
      this.notify.status(ok, true);
      return true;
    } catch (e) {
      this.notify.status('');
      this.notify.alert('Error: ' + (e as Error).message);
      return false;
    }
  }

  async addExercise(f: ExerciseForm): Promise<boolean> {
    const res = formToExercise(f);
    if (!res.ok) {
      this.notify.alert(res.error);
      return false;
    }
    return this.run(`«${res.data.name}» añadido ✓`, () => this.repo.addExercise(res.data));
  }

  /** Borra el ejercicio y todos sus registros, tras confirmarlo */
  async deleteExercise(id: string): Promise<boolean> {
    const ex = this.store.exercise(id);
    if (!ex) return false;
    const n = ex.records.length;
    const ok = await this.confirm.confirm({
      title: 'Eliminar ejercicio',
      message: n
        ? `¿Eliminar «${ex.name}» y sus ${n} registro${n === 1 ? '' : 's'}? No se puede deshacer.`
        : `¿Eliminar «${ex.name}»?`,
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!ok) return false;
    return this.run(`«${ex.name}» eliminado`, () => this.repo.deleteExercise(id));
  }

  async addRecord(exerciseId: string, f: RecordForm): Promise<boolean> {
    const res = formToRecord(f);
    if (!res.ok) {
      this.notify.alert(res.error);
      return false;
    }
    return this.run(`${res.data.type} registrado ✓`, () =>
      this.repo.addRecord(exerciseId, res.data),
    );
  }

  async deleteRecord(exerciseId: string, recordId: string): Promise<boolean> {
    const ok = await this.confirm.confirm({
      title: 'Eliminar registro',
      message: 'Se borrará este registro del historial del ejercicio.',
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!ok) return false;
    return this.run('Registro eliminado', () => this.repo.deleteRecord(exerciseId, recordId));
  }
}

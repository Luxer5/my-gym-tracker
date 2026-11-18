import { Injectable, inject } from '@angular/core';
import { TrainingRepository } from '../../core/data/training-repository';
import { ConfirmService } from '../../core/services/confirm.service';
import { NotifyService } from '../../core/services/notify.service';
import { TrainingStore } from '../../core/state/training-store';
import { fmtDuration } from '../../domain/format';
import { RaceForm, formToRace } from '../../domain/race-forms';

/** Casos de uso de Carreras */
@Injectable({ providedIn: 'root' })
export class RaceActions {
  private readonly repo = inject(TrainingRepository);
  private readonly store = inject(TrainingStore);
  private readonly notify = inject(NotifyService);
  private readonly confirm = inject(ConfirmService);

  /** Guarda la carrera revisada; devuelve su id o null si no se guardó */
  async save(f: RaceForm): Promise<string | null> {
    const res = formToRace(f);
    if (!res.ok) {
      this.notify.alert(res.error);
      return null;
    }
    this.notify.status('Guardando…');
    try {
      const id = await this.repo.addRace(res.data);
      this.notify.status(`${res.data.event} · ${fmtDuration(res.data.totalSec)} guardada ✓`, true);
      return id;
    } catch (e) {
      this.notify.status('');
      this.notify.alert('Error: ' + (e as Error).message);
      return null;
    }
  }

  /** Borra la carrera tras confirmarlo; true si se borró */
  async remove(id: string): Promise<boolean> {
    const race = this.store.race(id);
    if (!race) return false;
    const ok = await this.confirm.confirm({
      title: 'Eliminar carrera',
      message: `¿Eliminar ${race.event} (${fmtDuration(race.totalSec)}) y todos sus tramos?`,
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!ok) return false;
    this.notify.status('Guardando…');
    try {
      await this.repo.deleteRace(id);
      this.notify.status('Carrera eliminada', true);
      return true;
    } catch (e) {
      this.notify.status('');
      this.notify.alert('Error: ' + (e as Error).message);
      return false;
    }
  }
}

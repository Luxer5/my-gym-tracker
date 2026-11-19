import { Injectable, inject } from '@angular/core';
import { TrainingRepository } from '../../core/data/training-repository';
import { ConfirmService } from '../../core/services/confirm.service';
import { NotifyService } from '../../core/services/notify.service';
import { TrainingStore } from '../../core/state/training-store';
import { fmtDmy, fmtTime } from '../../domain/format';
import { HyroxForm, RunTestForm, formToHyrox, formToRunTest } from '../../domain/forms';
import { RUN_TEST_INFO, runTestValue } from '../../domain/run-tests';

/** Casos de uso de Hyrox. Los métodos que guardan devuelven true si se guardó. */
@Injectable({ providedIn: 'root' })
export class HyroxActions {
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

  async addTest(f: HyroxForm): Promise<boolean> {
    const res = formToHyrox(f);
    if (!res.ok) {
      this.notify.alert(res.error);
      return false;
    }
    const t = res.data;
    return this.run(`${t.station} · ${fmtTime(t.totalSec)} guardado ✓`, () =>
      this.repo.addHyrox(t),
    );
  }

  async deleteTest(id: string): Promise<boolean> {
    const t = this.store.hyrox().find((x) => x.id === id);
    if (!t) return false;
    const ok = await this.confirm.confirm({
      title: 'Eliminar test',
      message: `¿Eliminar el test de ${t.station} (${fmtTime(t.totalSec)})?`,
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!ok) return false;
    return this.run('Test eliminado', () => this.repo.deleteHyrox(id));
  }

  // ── Tests de carrera (VAM, Jim Vance 30') ──

  async addRunTest(f: RunTestForm): Promise<boolean> {
    const res = formToRunTest(f);
    if (!res.ok) {
      this.notify.alert(res.error);
      return false;
    }
    const t = res.data;
    return this.run(`${RUN_TEST_INFO[t.kind].name} · ${runTestValue(t)} guardado ✓`, () =>
      this.repo.addRunTest(t),
    );
  }

  async deleteRunTest(id: string): Promise<boolean> {
    const t = this.store.runTests().find((x) => x.id === id);
    if (!t) return false;
    const ok = await this.confirm.confirm({
      title: 'Eliminar test',
      message: `¿Eliminar el ${RUN_TEST_INFO[t.kind].name} del ${fmtDmy(t.date)} (${runTestValue(t)})?`,
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!ok) return false;
    return this.run('Test eliminado', () => this.repo.deleteRunTest(id));
  }
}

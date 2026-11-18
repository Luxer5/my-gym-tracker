import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { ExerciseWithRecords, RECORD_TYPES, RecordType } from '../../core/models';
import { RecordForm, emptyRecordForm } from '../../domain/forms';
import { RECORD_META } from '../../domain/records';
import { AutofocusDirective } from '../../shared/autofocus.directive';
import { ModalComponent } from '../../shared/modal.component';
import { GymActions } from './gym-actions.service';

/** Ventana de nuevo registro (PR / 1RM / 3RM / 5RM) de un ejercicio */
@Component({
  selector: 'app-record-form',
  imports: [ModalComponent, AutofocusDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './record-form.component.html',
})
export class RecordFormComponent {
  private readonly actions = inject(GymActions);
  readonly exercise = input.required<ExerciseWithRecords>();
  readonly closed = output<void>();

  protected readonly types = RECORD_TYPES;
  protected readonly meta = RECORD_META;
  protected readonly form = signal<RecordForm>(emptyRecordForm());
  protected readonly saving = signal(false);

  protected val(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }

  protected patch(p: Partial<RecordForm>): void {
    this.form.update((f) => ({ ...f, ...p }));
  }

  protected setType(type: RecordType): void {
    this.patch({ type });
  }

  protected async save(e: Event): Promise<void> {
    e.preventDefault();
    if (this.saving()) return;
    this.saving.set(true);
    const ok = await this.actions.addRecord(this.exercise().id, this.form());
    this.saving.set(false);
    if (ok) this.closed.emit();
  }
}

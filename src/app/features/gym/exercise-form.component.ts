import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { EXERCISE_CATEGORIES, WEIGHT_UNITS } from '../../core/models';
import { ExerciseForm, emptyExerciseForm } from '../../domain/forms';
import { AutofocusDirective } from '../../shared/autofocus.directive';
import { ModalComponent } from '../../shared/modal.component';
import { GymActions } from './gym-actions.service';

/** Ventana de alta de un ejercicio */
@Component({
  selector: 'app-exercise-form',
  imports: [ModalComponent, AutofocusDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-modal title="Nuevo" accent="ejercicio" (closed)="closed.emit()">
    <!-- novalidate: la validación es la del dominio (domain/forms.ts), con sus mensajes -->
    <form id="exercise-form" novalidate (submit)="save($event)">
      <div class="form-group">
        <label class="form-label" for="ex-name">Nombre</label>
        <input
          appAutofocus
          class="form-input"
          id="ex-name"
          maxlength="100"
          placeholder="Ej: Sentadilla, Press banca…"
          autocomplete="off"
          [value]="form().name"
          (input)="patch({ name: val($event) })"
        />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="ex-category">Categoría</label>
          <select class="form-select" id="ex-category" (change)="patch({ category: val($event) })">
            @for (c of categories; track c) {
              <option [value]="c" [selected]="c === form().category">{{ c }}</option>
            }
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="ex-unit">Unidad</label>
          <select class="form-select" id="ex-unit" (change)="patch({ unit: val($event) })">
            @for (u of units; track u) {
              <option [value]="u" [selected]="u === form().unit">{{ u }}</option>
            }
          </select>
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">Cancelar</button>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          Guardar ejercicio
        </button>
      </div>
    </form>
  </app-modal>`,
})
export class ExerciseFormComponent {
  private readonly actions = inject(GymActions);
  readonly closed = output<void>();

  protected readonly categories = EXERCISE_CATEGORIES;
  protected readonly units = WEIGHT_UNITS;
  protected readonly form = signal<ExerciseForm>(emptyExerciseForm());
  protected readonly saving = signal(false);

  protected val(e: Event): string {
    return (e.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected patch(p: Partial<ExerciseForm>): void {
    this.form.update((f) => ({ ...f, ...p }));
  }

  protected async save(e: Event): Promise<void> {
    e.preventDefault();
    if (this.saving()) return;
    this.saving.set(true);
    const ok = await this.actions.addExercise(this.form());
    this.saving.set(false);
    if (ok) this.closed.emit();
  }
}

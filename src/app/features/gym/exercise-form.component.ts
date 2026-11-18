import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { EXERCISE_CATEGORIES, Exercise, WEIGHT_UNITS } from '../../core/models';
import { ExerciseForm, emptyExerciseForm, exerciseToForm } from '../../domain/forms';
import { AutofocusDirective } from '../../shared/autofocus.directive';
import { ModalComponent } from '../../shared/modal.component';
import { GymActions } from './gym-actions.service';

/** Ventana de alta de un ejercicio o, si recibe uno, de edición de su nombre y categoría */
@Component({
  selector: 'app-exercise-form',
  imports: [ModalComponent, AutofocusDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-modal
    [title]="editing() ? 'Editar' : 'Nuevo'"
    accent="ejercicio"
    (closed)="closed.emit()"
  >
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
            @for (c of categories(); track c) {
              <option [value]="c" [selected]="c === form().category">{{ c }}</option>
            }
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="ex-unit">Unidad</label>
          <select
            class="form-select"
            id="ex-unit"
            [disabled]="editing()"
            [attr.aria-describedby]="editing() ? 'ex-unit-help' : null"
            (change)="patch({ unit: val($event) })"
          >
            @for (u of units; track u) {
              <option [value]="u" [selected]="u === form().unit">{{ u }}</option>
            }
          </select>
          @if (editing()) {
            <span class="form-help" id="ex-unit-help"
              >Sus registros están en {{ form().unit }}</span
            >
          }
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">Cancelar</button>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          {{ editing() ? 'Guardar cambios' : 'Guardar ejercicio' }}
        </button>
      </div>
    </form>
  </app-modal>`,
})
export class ExerciseFormComponent {
  private readonly actions = inject(GymActions);
  /** Ejercicio que se edita; sin él, la ventana da de alta uno nuevo */
  readonly exercise = input<Exercise | null>(null);
  readonly closed = output<void>();

  protected readonly editing = computed(() => this.exercise() !== null);
  /** Las categorías de la app y, si el ejercicio tiene otra (datos antiguos), también esa */
  protected readonly categories = computed((): readonly string[] => {
    const own = this.exercise()?.category;
    return own && !(EXERCISE_CATEGORIES as readonly string[]).includes(own)
      ? [...EXERCISE_CATEGORIES, own]
      : EXERCISE_CATEGORIES;
  });
  protected readonly units = WEIGHT_UNITS;
  /** Se rellena con el ejercicio que se edita; lo que se escribe no se pierde si llegan datos */
  protected readonly form = linkedSignal<Exercise | null, ExerciseForm>({
    source: () => this.exercise(),
    computation: (ex, prev) =>
      prev && ex && prev.source?.id === ex.id
        ? prev.value
        : ex
          ? exerciseToForm(ex)
          : emptyExerciseForm(),
  });
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
    const ex = this.exercise();
    const ok = ex
      ? await this.actions.updateExercise(ex.id, this.form())
      : await this.actions.addExercise(this.form());
    this.saving.set(false);
    if (ok) this.closed.emit();
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TrainingStore } from '../../core/state/training-store';
import { ALL, categoryFilters, filterByCategory, gymSummary } from '../../domain/records';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { SummaryBarComponent, SummaryItem } from '../../shared/summary-bar.component';
import { ExerciseCardComponent } from './exercise-card.component';
import { ExerciseFormComponent } from './exercise-form.component';
import { RecordFormComponent } from './record-form.component';

/** Pantalla Gym: resumen, filtro por categoría y una tarjeta por ejercicio con sus PRs y RMs */
@Component({
  selector: 'app-gym',
  imports: [
    SummaryBarComponent,
    EmptyStateComponent,
    SkeletonComponent,
    ExerciseCardComponent,
    ExerciseFormComponent,
    RecordFormComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gym.component.html',
})
export class GymComponent {
  protected readonly store = inject(TrainingStore);
  protected readonly ALL = ALL;

  private readonly chosenFilter = signal(ALL);
  protected readonly filters = computed(() => categoryFilters(this.store.exercises()));
  /** Si la categoría elegida desaparece (se borró su último ejercicio) se vuelve a «Todos» */
  protected readonly filter = computed(() =>
    this.filters().includes(this.chosenFilter()) ? this.chosenFilter() : ALL,
  );
  protected readonly list = computed(() => filterByCategory(this.store.exercises(), this.filter()));

  protected readonly summary = computed((): SummaryItem[] => {
    const s = gymSummary(this.store.exercises());
    return [
      { value: s.exercises, label: 'Ejercicios' },
      { value: s.prs, label: 'PRs' },
      { value: s.rms, label: 'RMs' },
    ];
  });

  /** Ventanas abiertas: alta y edición de ejercicio y nuevo registro (id del ejercicio) */
  protected readonly addingExercise = signal(false);
  protected readonly editingId = signal<string | null>(null);
  /** Si el ejercicio se borra (en otro dispositivo) mientras se edita, la ventana se cierra */
  protected readonly editing = computed(() => {
    const id = this.editingId();
    return id ? (this.store.exercise(id) ?? null) : null;
  });
  private readonly recordForId = signal<string | null>(null);
  protected readonly recordFor = computed(() => {
    const id = this.recordForId();
    return id ? (this.store.exercise(id) ?? null) : null;
  });

  protected setFilter(cat: string): void {
    this.chosenFilter.set(cat);
  }

  protected openRecord(exerciseId: string): void {
    this.recordForId.set(exerciseId);
  }

  protected closeRecord(): void {
    this.recordForId.set(null);
  }
}

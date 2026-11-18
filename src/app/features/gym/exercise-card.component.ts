import { IconComponent } from '../../shared/icon.component';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ExerciseWithRecords } from '../../core/models';
import { byDateDesc, lastRecordDate, recordBoxes } from '../../domain/records';
import { FORMAT_PIPES } from '../../shared/format.pipes';
import { GymActions } from './gym-actions.service';

/** Tarjeta de un ejercicio: mejor PR/1RM/3RM/5RM, último registro e historial desplegable */
@Component({
  selector: 'app-exercise-card',
  imports: [IconComponent, ...FORMAT_PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './exercise-card.component.html',
})
export class ExerciseCardComponent {
  private readonly actions = inject(GymActions);
  readonly exercise = input.required<ExerciseWithRecords>();
  /** Pide abrir el formulario de nuevo registro */
  readonly addRecord = output<void>();
  /** Pide abrir el formulario para cambiar el nombre o la categoría */
  readonly edit = output<void>();

  protected readonly boxes = computed(() => recordBoxes(this.exercise().records));
  protected readonly history = computed(() => byDateDesc(this.exercise().records));
  protected readonly lastDate = computed(() => lastRecordDate(this.exercise().records));
  /** El historial abierto se mantiene aunque lleguen datos nuevos */
  protected readonly historyOpen = signal(false);

  protected remove(): void {
    void this.actions.deleteExercise(this.exercise().id);
  }

  protected removeRecord(recordId: string): void {
    void this.actions.deleteRecord(this.exercise().id, recordId);
  }
}

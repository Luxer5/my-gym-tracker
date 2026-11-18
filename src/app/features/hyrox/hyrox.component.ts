import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TrainingStore } from '../../core/state/training-store';
import { hyroxGroups, hyroxSummary } from '../../domain/hyrox';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { SummaryBarComponent, SummaryItem } from '../../shared/summary-bar.component';
import { HyroxCardComponent } from './hyrox-card.component';
import { HyroxFormComponent } from './hyrox-form.component';

/** Pantalla Hyrox: tests agrupados por estación y distancia/peso, con la mejor marca de cada uno */
@Component({
  selector: 'app-hyrox',
  imports: [SummaryBarComponent, EmptyStateComponent, HyroxCardComponent, HyroxFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hyrox.component.html',
})
export class HyroxComponent {
  protected readonly store = inject(TrainingStore);

  protected readonly groups = computed(() => hyroxGroups(this.store.hyrox()));
  protected readonly summary = computed((): SummaryItem[] => {
    const s = hyroxSummary(this.store.hyrox());
    return [
      { value: s.tests, label: 'Tests totales' },
      { value: s.stations, label: 'Estaciones' },
      { value: s.combos, label: 'Combis distintas' },
    ];
  });

  protected readonly adding = signal(false);
}

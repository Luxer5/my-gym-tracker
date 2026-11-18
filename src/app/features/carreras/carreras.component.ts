import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TrainingStore } from '../../core/state/training-store';
import { fmtDelta, fmtDuration } from '../../domain/format';
import { raceCards, racesSummary } from '../../domain/race';
import { ChartDirective } from '../../shared/chart.directive';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { FORMAT_PIPES } from '../../shared/format.pipes';
import { SegmentedBarComponent } from '../../shared/segmented-bar.component';
import { SummaryBarComponent, SummaryItem } from '../../shared/summary-bar.component';
import { RACE_COLORS, breakdownParts, evolutionChart } from './race-charts';

/** Pantalla Carreras: resumen, evolución del tiempo total y una tarjeta por carrera importada */
@Component({
  selector: 'app-carreras',
  imports: [
    RouterLink,
    SummaryBarComponent,
    EmptyStateComponent,
    SegmentedBarComponent,
    ChartDirective,
    ...FORMAT_PIPES,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './carreras.component.html',
})
export class CarrerasComponent {
  protected readonly store = inject(TrainingStore);
  protected readonly colors = RACE_COLORS;

  protected readonly cards = computed(() =>
    raceCards(this.store.races()).map((c) => ({ ...c, parts: breakdownParts(c.race) })),
  );

  protected readonly summary = computed((): SummaryItem[] => {
    const s = racesSummary(this.store.races());
    return [
      { value: s.count, label: s.count === 1 ? 'Carrera' : 'Carreras' },
      { value: s.best ? fmtDuration(s.best.totalSec) : '—', label: 'Mejor marca' },
      {
        value: s.improvement ? fmtDelta(s.improvement).slice(1) : '—',
        label: 'Mejora total',
      },
    ];
  });

  protected readonly evolution = computed(() =>
    this.store.races().length > 1 ? evolutionChart(this.store.races()) : null,
  );
}

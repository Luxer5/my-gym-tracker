import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TrainingStore } from '../../core/state/training-store';
import { fmtDelta, fmtDuration } from '../../domain/format';
import { blockTrend, raceCards, racesSummary } from '../../domain/race';
import { ChartDirective } from '../../shared/chart.directive';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { FORMAT_PIPES } from '../../shared/format.pipes';
import { IconComponent } from '../../shared/icon.component';
import { SegmentedBarComponent } from '../../shared/segmented-bar.component';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { SummaryBarComponent, SummaryItem } from '../../shared/summary-bar.component';
import { RACE_COLORS, blocksChart, breakdownParts, evolutionChart } from './race-charts';

/** Segundos ganados sin signo: 365 → 6:05 */
const gain = (n: number): string => fmtDelta(n).slice(1);

/**
 * Pantalla Carreras: resumen, evolución del tiempo total, de dónde viene la mejora (running,
 * estaciones y Roxzone) y una tarjeta por carrera importada
 */
@Component({
  selector: 'app-carreras',
  imports: [
    IconComponent,
    RouterLink,
    SummaryBarComponent,
    EmptyStateComponent,
    SegmentedBarComponent,
    SkeletonComponent,
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
      s.best
        ? { value: s.best.totalSec, label: 'Mejor marca', format: fmtDuration }
        : { value: '—', label: 'Mejor marca' },
      s.improvement
        ? { value: s.improvement, label: 'Mejora total', format: gain }
        : { value: '—', label: 'Mejora total' },
    ];
  });

  protected readonly evolution = computed(() =>
    this.store.races().length > 1 ? evolutionChart(this.store.races()) : null,
  );
  protected readonly blocks = computed(() =>
    this.store.races().length > 1 ? blocksChart(blockTrend(this.store.races())) : null,
  );
}

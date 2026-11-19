import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TrainingStore } from '../../core/state/training-store';
import { fmtDuration } from '../../domain/format';
import {
  RACE_STATIONS,
  avgRun,
  compareRaces,
  previousRace,
  raceGap,
  raceInsights,
  raceSegments,
  roxzoneOf,
  runExtremes,
  runTotal,
  sortRaces,
  stationTotal,
  trainingComparison,
} from '../../domain/race';
import { ChartDirective } from '../../shared/chart.directive';
import { CountUpDirective } from '../../shared/count-up.directive';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { FORMAT_PIPES } from '../../shared/format.pipes';
import { IconComponent } from '../../shared/icon.component';
import { SegmentedBarComponent } from '../../shared/segmented-bar.component';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { RaceActions } from './race-actions.service';
import { breakdownParts, deltaChart, gapChart, lapsChart, splitsChart } from './race-charts';

/**
 * Ficha de una carrera: cifras, reparto del tiempo, gráficas, conclusiones y comparaciones.
 * La carrera con la que se compara (por defecto, la anterior de la misma división) se elige arriba
 * y afecta a toda la ficha: diferencias en las cifras, puntos grises en las gráficas, ventaja
 * acumulada y diferencia por tramo.
 */
@Component({
  selector: 'app-race-detail',
  imports: [
    IconComponent,
    RouterLink,
    ChartDirective,
    CountUpDirective,
    EmptyStateComponent,
    SegmentedBarComponent,
    SkeletonComponent,
    ...FORMAT_PIPES,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './race-detail.component.html',
})
export class RaceDetailComponent {
  protected readonly store = inject(TrainingStore);
  private readonly actions = inject(RaceActions);
  private readonly router = inject(Router);

  /** Id de la ruta /carreras/:id */
  readonly id = input.required<string>();

  protected readonly race = computed(() => this.store.race(this.id()) ?? null);
  protected readonly fmtDuration = fmtDuration;
  /** «HYROX Madrid» → «Madrid» */
  protected readonly short = (event: string): string => event.replace(/^HYROX\s+/i, '');

  protected readonly stats = computed(() => {
    const r = this.race();
    if (!r) return null;
    const rox = roxzoneOf(r);
    const { best, worst } = runExtremes(r);
    return {
      run: runTotal(r),
      pace: avgRun(r),
      stations: stationTotal(r),
      roxzone: rox,
      roxzoneShare: Math.round((rox / (r.totalSec || 1)) * 100),
      best,
      worst,
    };
  });

  protected readonly parts = computed(() => {
    const r = this.race();
    return r ? breakdownParts(r) : [];
  });
  protected readonly segments = computed(() => {
    const r = this.race();
    return r ? raceSegments(r) : [];
  });
  protected readonly insights = computed(() => {
    const r = this.race();
    return r ? raceInsights(r) : [];
  });
  protected readonly training = computed(() => {
    const r = this.race();
    return r ? trainingComparison(r, this.store.hyrox()) : [];
  });

  // ── Comparación con otra carrera ──

  protected readonly others = computed(() => {
    const r = this.race();
    return r ? sortRaces(this.store.races()).filter((o) => o.id !== r.id) : [];
  });
  /** Carrera con la que se compara: por defecto la anterior de la misma división */
  protected readonly compareId = linkedSignal(() => {
    const r = this.race();
    if (!r) return null;
    return previousRace(r, this.store.races())?.id ?? this.others()[0]?.id ?? null;
  });
  protected readonly other = computed(() => {
    const id = this.compareId();
    return id ? (this.store.race(id) ?? null) : null;
  });
  protected readonly comparison = computed(() => {
    const r = this.race();
    const o = this.other();
    return r && o ? compareRaces(r, o) : [];
  });
  protected readonly totalDelta = computed(() => this.comparison().at(-1)?.delta ?? null);

  /** Diferencia de cada cifra con la otra carrera (null sin comparación) */
  protected readonly tileDelta = computed(() => {
    const s = this.stats();
    const o = this.other();
    if (!s || !o) return null;
    return {
      run: s.run - runTotal(o),
      stations: s.stations - stationTotal(o),
      roxzone: s.roxzone - roxzoneOf(o),
      best: s.best.sec - runExtremes(o).best.sec,
    };
  });

  // ── Gráficas ──

  protected readonly splitsConfig = computed(() => {
    const r = this.race();
    return r ? splitsChart(r, this.other()) : null;
  });
  protected readonly lapsConfig = computed(() => {
    const r = this.race();
    return r ? lapsChart(r, this.other()) : null;
  });
  protected readonly gapConfig = computed(() => {
    const r = this.race();
    const o = this.other();
    return r && o ? gapChart(raceGap(r, o), o.event) : null;
  });
  protected readonly deltaConfig = computed(() => {
    const o = this.other();
    const rows = this.comparison();
    return o && rows.length ? deltaChart(rows, o.event) : null;
  });

  protected readonly stationLabel = (i: number) => RACE_STATIONS[i].label;

  protected selectOther(e: Event): void {
    this.compareId.set((e.target as HTMLSelectElement).value || null);
  }

  protected async remove(): Promise<void> {
    if (await this.actions.remove(this.id())) await this.router.navigate(['/carreras']);
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TrainingStore } from '../../core/state/training-store';
import {
  EstimatorValues,
  RANGE_FACTORS,
  baseAdjustment,
  estimate,
  estimateRows,
  sliderRange,
  valuesFromRace,
} from '../../domain/estimator';
import { fmtDuration, fmtGap } from '../../domain/format';
import { RACE_STATIONS, sortRaces } from '../../domain/race';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { FORMAT_PIPES } from '../../shared/format.pipes';
import { BarPart, SegmentedBarComponent } from '../../shared/segmented-bar.component';
import { RACE_COLORS } from './race-charts';

/**
 * Estimador de tiempo: parte de una carrera (la última, o `?base=<id>`) y con deslizadores para el
 * running, la Roxzone y cada estación calcula el tiempo que harías
 */
@Component({
  selector: 'app-estimator',
  imports: [RouterLink, EmptyStateComponent, SegmentedBarComponent, ...FORMAT_PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './estimator.component.html',
})
export class EstimatorComponent {
  protected readonly store = inject(TrainingStore);

  /** Carrera de partida (parámetro `?base=` de la ruta); sin él, la más reciente */
  readonly base = input<string>();

  protected readonly races = computed(() => sortRaces(this.store.races()));
  private readonly chosenId = linkedSignal(() => this.base() ?? null);
  protected readonly race = computed(() => {
    const list = this.races();
    return list.find((r) => r.id === this.chosenId()) ?? list[0] ?? null;
  });
  private readonly baseValues = computed(() => {
    const r = this.race();
    return r ? valuesFromRace(r) : null;
  });
  /** Valores de los deslizadores: vuelven a los de la carrera al cambiarla */
  protected readonly values = linkedSignal<EstimatorValues | null>(() => {
    const b = this.baseValues();
    return b ? { ...b, stations: [...b.stations] } : null;
  });

  protected readonly result = computed(() => {
    const v = this.values();
    return v ? estimate(v) : null;
  });
  protected readonly total = computed(() => {
    const r = this.race();
    const e = this.result();
    return r && e ? e.total + baseAdjustment(r) : 0;
  });
  protected readonly delta = computed(() => this.total() - (this.race()?.totalSec ?? 0));
  protected readonly deltaText = computed(() => {
    const r = this.race();
    if (!r) return '';
    return this.delta() ? `${fmtGap(this.delta())} que ${r.event}` : `Igual que ${r.event}`;
  });

  protected readonly parts = computed((): BarPart[] => {
    const e = this.result();
    if (!e) return [];
    return [
      { label: 'Running', value: e.run, color: RACE_COLORS.run, text: fmtDuration(e.run) },
      {
        label: 'Estaciones',
        value: e.stations,
        color: RACE_COLORS.station,
        text: fmtDuration(e.stations),
      },
      { label: 'Roxzone', value: e.rox, color: RACE_COLORS.roxzone, text: fmtDuration(e.rox) },
    ];
  });

  protected readonly runRange = computed(() =>
    sliderRange(this.baseValues()?.run ?? 0, RANGE_FACTORS.run),
  );
  protected readonly roxRange = computed(() =>
    sliderRange(this.baseValues()?.rox ?? 0, RANGE_FACTORS.rox),
  );
  protected readonly stations = computed(() => {
    const b = this.baseValues();
    const v = this.values();
    if (!b || !v) return [];
    return RACE_STATIONS.map((st, i) => ({
      label: st.label,
      detail: st.detail,
      value: v.stations[i],
      delta: v.stations[i] - b.stations[i],
      range: sliderRange(b.stations[i], RANGE_FACTORS.station),
    }));
  });
  protected readonly rows = computed(() => {
    const b = this.baseValues();
    const v = this.values();
    return b && v ? estimateRows(b, v) : [];
  });
  protected readonly runDelta = computed(
    () => (this.values()?.run ?? 0) - (this.baseValues()?.run ?? 0),
  );
  protected readonly roxDelta = computed(
    () => (this.values()?.rox ?? 0) - (this.baseValues()?.rox ?? 0),
  );

  private num(e: Event): number {
    return +(e.target as HTMLInputElement).value;
  }

  protected setRun(e: Event): void {
    const run = this.num(e);
    this.values.update((v) => (v ? { ...v, run } : v));
  }

  protected setRox(e: Event): void {
    const rox = this.num(e);
    this.values.update((v) => (v ? { ...v, rox } : v));
  }

  protected setStation(i: number, e: Event): void {
    const sec = this.num(e);
    this.values.update((v) =>
      v ? { ...v, stations: v.stations.map((s, k) => (k === i ? sec : s)) } : v,
    );
  }

  protected selectBase(e: Event): void {
    this.chosenId.set((e.target as HTMLSelectElement).value);
  }

  protected reset(): void {
    const b = this.baseValues();
    this.values.set(b ? { ...b, stations: [...b.stations] } : null);
  }
}

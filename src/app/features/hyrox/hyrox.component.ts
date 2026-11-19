import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TrainingStore } from '../../core/state/training-store';
import { RUN_TEST_KINDS, RunTestKind } from '../../core/models';
import { hyroxGroups, hyroxSummary } from '../../domain/hyrox';
import { runTestsOf } from '../../domain/run-tests';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { SummaryBarComponent, SummaryItem } from '../../shared/summary-bar.component';
import { HyroxCardComponent } from './hyrox-card.component';
import { HyroxFormComponent } from './hyrox-form.component';
import { RunTestCardComponent } from './run-test-card.component';
import { RunTestFormComponent } from './run-test-form.component';

/**
 * Pantalla Hyrox: tests agrupados por estación y distancia/peso, con la mejor marca de cada uno, y
 * tests de carrera (VAM, Jim Vance 30') con sus zonas de entrenamiento
 */
@Component({
  selector: 'app-hyrox',
  imports: [
    SummaryBarComponent,
    EmptyStateComponent,
    HyroxCardComponent,
    HyroxFormComponent,
    RunTestCardComponent,
    RunTestFormComponent,
  ],
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

  // ── Tests de carrera ──
  protected readonly runKinds = RUN_TEST_KINDS;
  /** Tests de cada tipo, del más reciente al más antiguo */
  protected readonly runTests = computed(() => {
    const list = this.store.runTests();
    return { vam: runTestsOf(list, 'vam'), vance30: runTestsOf(list, 'vance30') };
  });
  /** Tipo de test que se está registrando (null: ventana cerrada) */
  protected readonly addingRun = signal<RunTestKind | null>(null);
}

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RunTest, RunTestKind } from '../../core/models';
import {
  RUN_TEST_INFO,
  hrRangeLabel,
  paceRangeLabel,
  runTestDetail,
  runTestProgress,
  runTestValue,
  vamZones,
  vanceHrZones,
  vancePaceZones,
} from '../../domain/run-tests';
import { FORMAT_PIPES } from '../../shared/format.pipes';
import { IconComponent } from '../../shared/icon.component';
import { HyroxActions } from './hyrox-actions.service';

/**
 * Tarjeta de un test de carrera (VAM o Jim Vance 30'): último resultado, sus zonas de
 * entrenamiento, cómo se hace el test e historial.
 */
@Component({
  selector: 'app-run-test-card',
  imports: [IconComponent, ...FORMAT_PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './run-test-card.component.html',
})
export class RunTestCardComponent {
  private readonly actions = inject(HyroxActions);
  readonly kind = input.required<RunTestKind>();
  /** Tests de este tipo, del más reciente al más antiguo */
  readonly tests = input.required<readonly RunTest[]>();
  /** Se pulsa «Registrar» */
  readonly add = output<void>();

  protected readonly info = computed(() => RUN_TEST_INFO[this.kind()]);
  /** Las zonas salen siempre del último test */
  protected readonly latest = computed(() => this.tests()[0]);
  protected readonly progress = computed(() => {
    const t = this.latest();
    return t ? runTestProgress(t, this.tests()[1]) : null;
  });
  protected readonly vamZones = computed(() => {
    const d = this.latest()?.distanceM;
    return this.kind() === 'vam' && d ? vamZones(d) : [];
  });
  protected readonly paceZones = computed(() => {
    const p = this.latest()?.paceSec;
    return this.kind() === 'vance30' && p ? vancePaceZones(p) : [];
  });
  protected readonly hrZones = computed(() => {
    const l = this.latest()?.lthr;
    return this.kind() === 'vance30' && l ? vanceHrZones(l) : [];
  });

  protected readonly protocolOpen = signal(false);
  protected readonly historyOpen = signal(false);

  protected readonly value = runTestValue;
  protected readonly detail = runTestDetail;
  protected readonly paceRange = paceRangeLabel;
  protected readonly hrRange = hrRangeLabel;
  protected readonly pct = (p: number): string => `${Math.round(p * 100)} %`;

  protected remove(id: string): void {
    void this.actions.deleteRunTest(id);
  }
}

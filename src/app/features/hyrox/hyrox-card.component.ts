import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { HyroxGroup, split500 } from '../../domain/hyrox';
import { fmtTime } from '../../domain/format';
import { FORMAT_PIPES } from '../../shared/format.pipes';
import { IconComponent } from '../../shared/icon.component';
import { SparklineComponent } from '../../shared/sparkline.component';
import { HyroxActions } from './hyrox-actions.service';

/**
 * Tarjeta de una estación + distancia/peso: mejor marca con su tendencia (minigráfica, más rápido
 * arriba), mejora e historial de tests
 */
@Component({
  selector: 'app-hyrox-card',
  imports: [IconComponent, SparklineComponent, ...FORMAT_PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hyrox-card.component.html',
})
export class HyroxCardComponent {
  private readonly actions = inject(HyroxActions);
  readonly group = input.required<HyroxGroup>();
  protected readonly historyOpen = signal(false);
  protected readonly split = split500;

  /** Tiempos en orden cronológico (los tests vienen del mejor al peor) */
  protected readonly trend = computed(() =>
    [...this.group().entries].sort((a, b) => a.date.localeCompare(b.date)).map((t) => t.totalSec),
  );
  protected readonly trendLabel = computed(() => {
    const t = this.trend();
    return `Tendencia: de ${fmtTime(t[0])} a ${fmtTime(t[t.length - 1])} en ${t.length} tests`;
  });

  protected remove(id: string): void {
    void this.actions.deleteTest(id);
  }
}

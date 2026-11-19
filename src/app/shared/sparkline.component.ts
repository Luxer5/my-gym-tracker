import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { sparkline } from '../domain/sparkline';

/**
 * Minigráfica de tendencia: línea en el tono atenuado y el último valor en el acento (guía de
 * visualización para las cifras con tendencia). Sin ejes: acompaña a una cifra que ya se ve.
 * Necesita al menos dos valores; con uno no pinta nada.
 */
@Component({
  selector: 'app-sparkline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (spark(); as s) {
    <svg
      class="spark"
      [attr.viewBox]="'0 0 ' + width + ' ' + height"
      [attr.width]="width"
      [attr.height]="height"
      role="img"
      [attr.aria-label]="label()"
    >
      <path class="spark-area" [attr.d]="s.area" />
      <path class="spark-line" [attr.d]="s.line" pathLength="1" />
      @let last = s.points[s.points.length - 1];
      <circle class="spark-dot" [attr.cx]="last.x" [attr.cy]="last.y" r="3.5" />
    </svg>
  }`,
})
export class SparklineComponent {
  /** Valores en orden cronológico */
  readonly values = input.required<readonly number[]>();
  /** Menos es mejor (tiempos): los valores bajos van arriba */
  readonly invert = input(false);
  /** Texto para lectores de pantalla */
  readonly label = input('');

  protected readonly width = 112;
  protected readonly height = 36;
  protected readonly spark = computed(() =>
    sparkline(this.values(), this.width, this.height, { pad: 5, invert: this.invert() }),
  );
}

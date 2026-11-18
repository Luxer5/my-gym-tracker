import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface BarPart {
  label: string;
  value: number;
  color: string;
  /** Cifra que se muestra (p. ej. «38:09») */
  text: string;
}

/**
 * Barra segmentada: cómo se reparte un todo en pocas partes. La alta lleva la cifra y el porcentaje
 * sobre cada bloque (si cabe) y una leyenda; la fina va sin textos, junto a cifras que ya se ven.
 */
@Component({
  selector: 'app-segmented-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div
      class="seg-bar"
      [class.seg-bar--thin]="thin()"
      role="img"
      [attr.aria-label]="ariaLabel()"
    >
      @for (p of rows(); track p.label) {
        <div
          class="seg"
          [style.flex-grow]="p.value"
          [style.background]="p.color"
          [attr.title]="p.label + ': ' + p.text + ' (' + p.pct + ')'"
        >
          @if (!thin() && p.share >= 0.12) {
            <span class="seg-text">{{ p.pct }}</span>
          }
        </div>
      }
    </div>
    @if (legend()) {
      <ul class="seg-legend">
        @for (p of rows(); track p.label) {
          <li>
            <span class="swatch" [style.background]="p.color" aria-hidden="true"></span>
            <span class="seg-legend-label">{{ p.label }}</span>
            <span class="seg-legend-value">{{ p.text }}</span>
            <span class="seg-legend-pct">{{ p.pct }}</span>
          </li>
        }
      </ul>
    }`,
})
export class SegmentedBarComponent {
  readonly parts = input.required<readonly BarPart[]>();
  readonly thin = input(false);
  readonly legend = input(true);

  protected readonly rows = computed(() => {
    const whole = this.parts().reduce((s, p) => s + p.value, 0) || 1;
    return this.parts().map((p) => ({
      ...p,
      share: p.value / whole,
      pct: `${Math.round((p.value / whole) * 100)} %`,
    }));
  });

  protected readonly ariaLabel = computed(() =>
    this.rows()
      .map((p) => `${p.label} ${p.text} (${p.pct})`)
      .join(', '),
  );
}

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface SummaryItem {
  value: number | string;
  label: string;
}

/** Cifras grandes de la cabecera de una pantalla, separadas por líneas verticales */
@Component({
  selector: 'app-summary-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="summary-bar">
    @for (it of items(); track it.label; let first = $first) {
      @if (!first) {
        <div class="summary-divider" aria-hidden="true"></div>
      }
      <div class="summary-item">
        <div class="summary-val">{{ it.value }}</div>
        <div class="summary-lbl">{{ it.label }}</div>
      </div>
    }
  </div>`,
})
export class SummaryBarComponent {
  readonly items = input.required<readonly SummaryItem[]>();
}

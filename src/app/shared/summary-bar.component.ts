import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CountUpDirective } from './count-up.directive';

export interface SummaryItem {
  /** Un número cuenta hasta su valor al aparecer; un texto («—») se pinta tal cual */
  value: number | string;
  label: string;
  /** Cómo se escribe el número (por defecto, tal cual): p. ej. fmtDuration para un tiempo */
  format?: (n: number) => string;
}

const plain = (n: number): string => String(n);

/** Cifras grandes de la cabecera de una pantalla, separadas por líneas verticales */
@Component({
  selector: 'app-summary-bar',
  imports: [CountUpDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="summary-bar">
    @for (it of items(); track it.label; let first = $first) {
      @if (!first) {
        <div class="summary-divider" aria-hidden="true"></div>
      }
      <div class="summary-item">
        @if (isNumber(it.value)) {
          <div class="summary-val" [appCountUp]="it.value" [countFormat]="it.format ?? plain"></div>
        } @else {
          <div class="summary-val">{{ it.value }}</div>
        }
        <div class="summary-lbl">{{ it.label }}</div>
      </div>
    }
  </div>`,
})
export class SummaryBarComponent {
  readonly items = input.required<readonly SummaryItem[]>();
  protected readonly plain = plain;
  protected readonly isNumber = (v: number | string): v is number => typeof v === 'number';
}

import { Directive, ElementRef, OnDestroy, effect, inject, input } from '@angular/core';
import { Chart, ChartConfiguration } from 'chart.js';
import { ChartThemeService } from '../core/services/chart-theme.service';

/**
 * Gráfica de Chart.js sobre un <canvas>: `<canvas [appChart]="config()"></canvas>`.
 * Cada vez que cambia la configuración se vuelve a crear (con su animación de entrada); con null se
 * destruye. El contenedor del canvas fija el alto (las gráficas no mantienen proporción).
 */
@Directive({ selector: 'canvas[appChart]' })
export class ChartDirective implements OnDestroy {
  readonly appChart = input<ChartConfiguration | null>(null);
  private readonly el = inject<ElementRef<HTMLCanvasElement>>(ElementRef);
  private readonly theme = inject(ChartThemeService);
  private chart: Chart | null = null;

  constructor() {
    effect(() => {
      const config = this.appChart();
      this.destroy();
      if (!config) return;
      this.theme.init();
      this.chart = new Chart(this.el.nativeElement, config);
    });
  }

  private destroy(): void {
    this.chart?.destroy();
    this.chart = null;
  }

  ngOnDestroy(): void {
    this.destroy();
  }
}

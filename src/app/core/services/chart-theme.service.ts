import { Injectable } from '@angular/core';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';

// Solo las piezas de Chart.js que usan las gráficas de la app (el resto no viaja en el bundle)
Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
);

/**
 * Aspecto común de las gráficas (tema oscuro de la app). Se aplica con la primera gráfica: Chart.js
 * se carga solo en las pantallas que lo usan.
 */
@Injectable({ providedIn: 'root' })
export class ChartThemeService {
  private ready = false;

  init(): void {
    if (this.ready) return;
    this.ready = true;
    Chart.defaults.color = '#a8a8a8';
    Chart.defaults.borderColor = 'rgba(240, 237, 232, 0.08)';
    Chart.defaults.font.family = "'Barlow', system-ui, sans-serif";
    Chart.defaults.font.size = 12;
    const tip = Chart.defaults.plugins.tooltip;
    tip.backgroundColor = 'rgba(13, 13, 13, 0.96)';
    tip.borderColor = '#3e3e3e';
    tip.borderWidth = 1;
    tip.titleColor = '#ffffff';
    tip.bodyColor = '#f0ede8';
    tip.padding = 10;
    tip.cornerRadius = 8;
    tip.boxPadding = 4;
    tip.titleFont = { family: "'Barlow Condensed', sans-serif", weight: 700, size: 13 };
    const leg = Chart.defaults.plugins.legend.labels;
    leg.usePointStyle = true;
    leg.boxWidth = 8;
    leg.boxHeight = 8;
    leg.color = '#f0ede8';
  }
}

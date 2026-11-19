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
import { prefersReducedMotion } from '../../shared/motion';

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
    // Entrada: las barras crecen y las líneas se dibujan con desaceleración; con «reducir
    // movimiento» se pintan directamente en su sitio
    const anim = Chart.defaults.animation as { duration: number; easing: string };
    anim.duration = prefersReducedMotion() ? 0 : 750;
    anim.easing = 'easeOutQuart';
    Chart.defaults.color = '#b4bcc8';
    Chart.defaults.borderColor = 'rgba(238, 241, 247, 0.08)';
    Chart.defaults.font.family = "'Barlow', system-ui, sans-serif";
    Chart.defaults.font.size = 12;
    const tip = Chart.defaults.plugins.tooltip;
    tip.backgroundColor = 'rgba(13, 19, 33, 0.96)';
    tip.borderColor = '#34405c';
    tip.borderWidth = 1;
    tip.titleColor = '#ffffff';
    tip.bodyColor = '#eef1f7';
    tip.padding = 10;
    tip.cornerRadius = 8;
    tip.boxPadding = 4;
    tip.titleFont = { family: "'Barlow Condensed', sans-serif", weight: 700, size: 14 };
    tip.bodyFont = { family: "'Barlow', sans-serif", size: 13 };
    tip.usePointStyle = true;
    tip.caretSize = 6;
    const leg = Chart.defaults.plugins.legend.labels;
    leg.usePointStyle = true;
    leg.boxWidth = 8;
    leg.boxHeight = 8;
    leg.color = '#eef1f7';
  }
}

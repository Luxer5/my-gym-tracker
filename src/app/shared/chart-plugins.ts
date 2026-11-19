import { Chart, ChartType, Plugin, ScriptableContext } from 'chart.js';

/** #c98500 → rgba(201, 133, 0, a) */
export const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/** Velo degradado del color de la serie bajo una línea (un velo, nunca un bloque saturado) */
export const seriesWash =
  (hex: string, top = 0.2) =>
  (ctx: ScriptableContext<'line'>): CanvasGradient | string => {
    const { chart } = ctx;
    const area = chart.chartArea;
    if (!area) return 'transparent';
    const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
    g.addColorStop(0, rgba(hex, top));
    g.addColorStop(1, rgba(hex, 0));
    return g;
  };

/**
 * Plugins propios de Chart.js para las gráficas de la app (sin dependencias nuevas): cifras en la
 * punta de las barras, notas en puntos concretos y una guía que sigue al puntero. Todo se dibuja en
 * el lienzo con las tintas del tema, nunca con el color de la serie (guía de visualización).
 */

const INK = '#eef1f7';
const INK_2 = '#b4bcc8';
const SURFACE_2 = '#1c2539';
const LINE = '#34405c';
const NUM_FONT = "600 12px 'Barlow Condensed', 'Barlow', system-ui, sans-serif";
const NOTE_FONT = "600 12px 'Barlow', system-ui, sans-serif";

interface Box {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
const overlaps = (a: Box, b: Box): boolean =>
  a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;

/** Posición animada (la del fotograma actual) de un elemento: las etiquetas acompañan a la entrada */
function propsOf(el: unknown, keys: string[]): Record<string, number> {
  return (el as { getProps(k: string[], final?: boolean): Record<string, number> }).getProps(
    keys,
    false,
  );
}

function pill(ctx: CanvasRenderingContext2D, b: Box): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1, 6);
  else ctx.rect(b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1);
  ctx.fillStyle = SURFACE_2;
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.stroke();
}

/**
 * Cifra en la punta de cada barra, por fuera. Solo se pinta si cabe sin pisar nada (guía: una
 * etiqueta que no cabe no se recorta): en vertical, si no es más ancha que el hueco de su categoría;
 * en horizontal, si queda sitio hasta el borde. `format` devuelve null para no etiquetar una barra.
 */
export function barValueLabels<T extends ChartType = 'bar'>(
  format: (value: number, index: number, datasetIndex: number) => string | null,
): Plugin<T> {
  return {
    id: 'barValueLabels',
    afterDatasetsDraw(c) {
      const chart = c as unknown as Chart;
      const { ctx, chartArea } = chart;
      const horizontal = chart.options.indexAxis === 'y';
      const count = chart.data.labels?.length || 1;
      const slot = (horizontal ? chartArea.height : chartArea.width) / count;
      ctx.save();
      ctx.font = NUM_FONT;
      ctx.fillStyle = INK_2;
      chart.data.datasets.forEach((ds, di) => {
        const meta = chart.getDatasetMeta(di);
        if (meta.type !== 'bar' || !chart.isDatasetVisible(di)) return;
        meta.data.forEach((bar, i) => {
          const value = ds.data[i];
          if (typeof value !== 'number') return;
          const text = format(value, i, di);
          if (!text) return;
          const { x, y, base } = propsOf(bar, ['x', 'y', 'base']);
          const w = ctx.measureText(text).width;
          if (horizontal) {
            const neg = x < base;
            const tx = neg ? x - 6 : x + 6;
            if (neg ? tx - w < chartArea.left : tx + w > chartArea.right) return;
            ctx.textAlign = neg ? 'right' : 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, tx, y);
          } else {
            if (w > slot - 4) return;
            const up = y <= base;
            ctx.textAlign = 'center';
            ctx.textBaseline = up ? 'bottom' : 'top';
            // Por encima también de los puntos de otras series en la misma categoría (la otra carrera)
            const top = up ? Math.min(y, edgeAt(chart, i, 'top')) : y;
            ctx.fillText(text, x, up ? top - 5 : y + 5);
          }
        });
      });
      ctx.restore();
    },
  };
}

export interface PointNote {
  datasetIndex: number;
  index: number;
  text: string;
  /** Encima (por defecto) o debajo del punto */
  place?: 'above' | 'below';
  /** Series cuyo punto en la misma posición no debe tapar la nota (p. ej. la otra carrera) */
  avoid?: readonly number[];
}

/**
 * Borde superior (o inferior) de los puntos de las series de línea visibles en una posición, con
 * su radio: lo que una etiqueta no debe pisar. Infinity / −Infinity si no hay ninguno.
 */
function edgeAt(
  chart: Chart,
  index: number,
  side: 'top' | 'bottom',
  only?: readonly number[],
): number {
  let edge = side === 'top' ? Infinity : -Infinity;
  chart.data.datasets.forEach((ds, di) => {
    const meta = chart.getDatasetMeta(di);
    if (meta.type !== 'line' || !chart.isDatasetVisible(di) || ds.data[index] == null) return;
    if (only && !only.includes(di)) return;
    const el = meta.data[index];
    if (!el) return;
    const { y } = propsOf(el, ['y']);
    const r = ((el as unknown as { options?: { radius?: number } }).options?.radius ?? 0) + 2;
    edge = side === 'top' ? Math.min(edge, y - r) : Math.max(edge, y + r);
  });
  return edge;
}

/**
 * Notas en puntos concretos (la mejor vuelta, la marca personal, el valor final): una píldora con el
 * texto junto al punto. Si una nota pisaría a otra ya pintada, se omite (el tooltip y la tabla siguen
 * dando el valor) en lugar de apilarlas.
 */
export function pointNotes<T extends ChartType = 'line'>(notes: readonly PointNote[]): Plugin<T> {
  return {
    id: 'pointNotes',
    afterDatasetsDraw(c) {
      const chart = c as unknown as Chart;
      const { ctx, chartArea } = chart;
      const drawn: Box[] = [];
      ctx.save();
      ctx.font = NOTE_FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const n of notes) {
        if (!chart.isDatasetVisible(n.datasetIndex)) continue;
        const el = chart.getDatasetMeta(n.datasetIndex).data[n.index];
        if (!el) continue;
        const { x, y } = propsOf(el, ['x', 'y']);
        const w = ctx.measureText(n.text).width + 14;
        const h = 22;
        const below = n.place === 'below';
        const cx = Math.min(Math.max(x, chartArea.left + w / 2), chartArea.right - w / 2);
        // El punto propio y los que haya que esquivar en la misma posición
        const own = [n.datasetIndex, ...(n.avoid ?? [])];
        const edge = edgeAt(chart, n.index, below ? 'bottom' : 'top', own);
        const ref = Number.isFinite(edge) ? edge : y;
        const raw = below ? ref + h / 2 + 4 : ref - h / 2 - 4;
        const cy = Math.min(Math.max(raw, h / 2 + 1), chart.height - h / 2 - 1);
        const box = { x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2 };
        if (drawn.some((b) => overlaps(b, box))) continue;
        drawn.push(box);
        pill(ctx, box);
        ctx.fillStyle = INK;
        ctx.fillText(n.text, cx, cy + 0.5);
      }
      ctx.restore();
    },
  };
}

/**
 * Guía bajo el puntero: en líneas, una vertical fina en el punto activo; en barras, una franja
 * suave en toda la categoría. Ayuda a leer el valor exacto con el tooltip.
 */
export function hoverGuide<T extends ChartType>(): Plugin<T> {
  return {
    id: 'hoverGuide',
    beforeDatasetsDraw(c) {
      const chart = c as unknown as Chart;
      const active = chart.tooltip?.getActiveElements() ?? [];
      if (!active.length) return;
      const { ctx, chartArea } = chart;
      const { x, y } = propsOf(active[0].element, ['x', 'y']);
      ctx.save();
      if ((chart.config as { type?: string }).type === 'line') {
        const px = Math.round(x) + 0.5;
        ctx.strokeStyle = 'rgba(238, 241, 247, 0.28)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, chartArea.top);
        ctx.lineTo(px, chartArea.bottom);
        ctx.stroke();
      } else {
        const horizontal = chart.options.indexAxis === 'y';
        const size =
          (horizontal ? chartArea.height : chartArea.width) / (chart.data.labels?.length || 1);
        ctx.fillStyle = 'rgba(238, 241, 247, 0.05)';
        if (horizontal) ctx.fillRect(chartArea.left, y - size / 2, chartArea.width, size);
        else ctx.fillRect(x - size / 2, chartArea.top, size, chartArea.height);
      }
      ctx.restore();
    },
  };
}

/**
 * Minigráfica de tendencia (sparkline): trazado SVG de una serie corta en un lienzo fijo, sin ejes.
 * La usan las tarjetas para enseñar cómo han ido los tests sin abrir el historial.
 */

export interface SparklinePoint {
  x: number;
  y: number;
}

export interface Sparkline {
  /** Atributo `d` de la línea */
  line: string;
  /** Atributo `d` del área bajo la línea (hasta el borde inferior) */
  area: string;
  points: SparklinePoint[];
}

const r2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Trazado de `values` (en orden cronológico) en un lienzo de `w`×`h` con `pad` de margen.
 * `invert`: los valores bajos van arriba (tiempos y ritmos: menos es mejor). Si todos los valores
 * son iguales, la línea va por el centro. null con menos de dos valores: no hay tendencia.
 */
export function sparkline(
  values: readonly number[],
  w: number,
  h: number,
  { pad = 4, invert = false }: { pad?: number; invert?: boolean } = {},
): Sparkline | null {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = (w - 2 * pad) / (values.length - 1);
  const points = values.map((v, i) => {
    // 0 = arriba, 1 = abajo
    const t = max === min ? 0.5 : invert ? (v - min) / (max - min) : (max - v) / (max - min);
    return { x: r2(pad + i * step), y: r2(pad + t * (h - 2 * pad)) };
  });
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
  const first = points[0];
  const last = points[points.length - 1];
  return { line, area: `${line} L${last.x} ${h} L${first.x} ${h} Z`, points };
}

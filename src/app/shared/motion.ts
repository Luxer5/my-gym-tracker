/**
 * ¿Hay que evitar el movimiento? Sí si la persona lo ha pedido en su sistema («reducir movimiento»)
 * o si el entorno no puede animar (sin matchMedia ni requestAnimationFrame, como jsdom en los
 * tests): entonces se pinta directamente el estado final.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  if (typeof window.requestAnimationFrame !== 'function') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

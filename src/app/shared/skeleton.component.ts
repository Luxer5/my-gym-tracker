import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Esqueleto de carga: la forma de las tarjetas (o de una ficha con gráfica) mientras llegan los
 * datos, en lugar de un «Cargando…» suelto. Reserva el sitio y evita saltos al pintarse.
 * Los lectores de pantalla oyen «Cargando…».
 */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="skeleton" [class.skeleton--detail]="variant() === 'detail'" role="status">
    <span class="visually-hidden">Cargando…</span>
    @if (variant() === 'detail') {
      <div class="sk-hero" aria-hidden="true">
        <div class="sk sk-card sk-tall"></div>
        <div class="sk sk-card sk-tall"></div>
      </div>
      <div class="sk sk-card sk-chart" aria-hidden="true"></div>
    } @else {
      @for (i of items(); track i) {
        <div class="sk-card sk-shell" aria-hidden="true">
          <div class="sk sk-line sk-w30"></div>
          <div class="sk sk-line sk-w55 sk-lg"></div>
          <div class="sk sk-block"></div>
          <div class="sk sk-line sk-w40"></div>
        </div>
      }
    }
  </div>`,
})
export class SkeletonComponent {
  readonly count = input(3);
  readonly variant = input<'cards' | 'detail'>('cards');
  protected readonly items = computed(() => Array.from({ length: this.count() }, (_, i) => i));
}

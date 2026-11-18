import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

let seq = 0;

/**
 * Ventana modal: título, contenido proyectado y cierre con Esc o pulsando fuera.
 * Quien la usa decide cuándo se pinta (`@if`) y la cierra al recibir `closed`.
 */
@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' },
  template: `<div class="modal-overlay" (click)="onOverlay($event)">
    <div class="modal" role="dialog" aria-modal="true" [attr.aria-labelledby]="titleId">
      <h2 class="modal-title" [id]="titleId">
        {{ title() }} <span>{{ accent() }}</span>
      </h2>
      <ng-content />
    </div>
  </div>`,
})
export class ModalComponent {
  /** Título en blanco y su parte destacada en amarillo: «Nuevo» + «ejercicio» */
  readonly title = input.required<string>();
  readonly accent = input('');
  readonly closed = output<void>();
  protected readonly titleId = `modal-title-${++seq}`;

  protected onOverlay(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.closed.emit();
  }
}

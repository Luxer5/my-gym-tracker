import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Mensaje de lista vacía (o cargando) con un icono grande atenuado */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="empty-state">
    <div class="icon" aria-hidden="true">{{ icon() }}</div>
    <p><ng-content /></p>
  </div>`,
})
export class EmptyStateComponent {
  readonly icon = input.required<string>();
}

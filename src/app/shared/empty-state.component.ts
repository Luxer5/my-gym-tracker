import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent, IconName } from './icon.component';

/** Mensaje de lista vacía (o cargando) con un icono grande atenuado */
@Component({
  selector: 'app-empty-state',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="empty-state">
    <svg class="empty-icon" [appIcon]="icon()"></svg>
    <p><ng-content /></p>
  </div>`,
})
export class EmptyStateComponent {
  readonly icon = input.required<IconName>();
}

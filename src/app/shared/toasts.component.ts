import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotifyService } from '../core/services/notify.service';

/** Contenedor de avisos (abajo a la derecha); se cierran solos o al pulsarlos */
@Component({
  selector: 'app-toasts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="toasts" role="status" aria-live="polite">
    @for (t of notify.toasts(); track t.id) {
      <div class="toast toast--{{ t.type }}" [class.in]="t.in" (click)="notify.dismiss(t.id)">
        {{ t.msg }}
      </div>
    }
  </div>`,
})
export class ToastsComponent {
  protected readonly notify = inject(NotifyService);
}

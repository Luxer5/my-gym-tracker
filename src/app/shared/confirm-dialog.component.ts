import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { ConfirmService } from '../core/services/confirm.service';

/**
 * Diálogo de confirmación: foco inicial en «Cancelar» si es destructivo (si no, en «Aceptar»),
 * Esc o clic fuera cancelan y al cerrar el foco vuelve a donde estaba.
 */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'close(false)' },
  template: `@if (svc.current(); as d) {
    <div class="modal-overlay" (click)="onOverlay($event)">
      <div
        class="modal modal--confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-msg"
      >
        <h2 class="modal-title" id="confirm-title">{{ d.title }}</h2>
        <p class="confirm-msg" id="confirm-msg">{{ d.message }}</p>
        <div class="modal-actions">
          <button #cancelBtn type="button" class="btn btn-ghost" (click)="close(false)">
            {{ d.cancelText }}
          </button>
          <button
            #okBtn
            type="button"
            class="btn"
            [class.btn-primary]="!d.danger"
            [class.btn-danger-solid]="d.danger"
            (click)="close(true)"
          >
            {{ d.confirmText }}
          </button>
        </div>
      </div>
    </div>
  }`,
})
export class ConfirmDialogComponent {
  protected readonly svc = inject(ConfirmService);
  private readonly doc = inject(DOCUMENT);
  private readonly cancelBtn = viewChild<ElementRef<HTMLButtonElement>>('cancelBtn');
  private readonly okBtn = viewChild<ElementRef<HTMLButtonElement>>('okBtn');
  private prevFocus: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const d = this.svc.current();
      const cancel = this.cancelBtn()?.nativeElement;
      const ok = this.okBtn()?.nativeElement;
      if (d && cancel && ok) {
        this.prevFocus = this.doc.activeElement as HTMLElement | null;
        (d.danger ? cancel : ok).focus();
      }
    });
  }

  protected close(ok: boolean): void {
    const d = this.svc.current();
    if (!d) return;
    const prev = this.prevFocus;
    this.prevFocus = null;
    d.resolve(ok);
    prev?.focus?.();
  }

  protected onOverlay(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.close(false);
  }
}

import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export interface ConfirmRequest extends Required<ConfirmOptions> {
  resolve: (ok: boolean) => void;
}

/** Diálogo de confirmación (sustituye a confirm()); lo pinta ConfirmDialogComponent */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly current = signal<ConfirmRequest | null>(null);

  confirm({
    title = '¿Confirmar?',
    message = '',
    confirmText = 'Aceptar',
    cancelText = 'Cancelar',
    danger = false,
  }: ConfirmOptions = {}): Promise<boolean> {
    // Un diálogo nuevo cancela el que estuviera abierto
    this.current()?.resolve(false);
    return new Promise<boolean>((resolve) => {
      this.current.set({
        title,
        message,
        confirmText,
        cancelText,
        danger,
        resolve: (ok) => {
          this.current.set(null);
          resolve(ok);
        },
      });
    });
  }
}

import { Injectable, signal } from '@angular/core';

export type ToastType = 'info' | 'success' | 'error';
export interface Toast {
  id: number;
  msg: string;
  type: ToastType;
  in: boolean;
}
export interface ToastHandle {
  kill(): void;
}

/** Avisos integrados en la interfaz (toasts); sustituyen a alert() */
@Injectable({ providedIn: 'root' })
export class NotifyService {
  readonly toasts = signal<Toast[]>([]);
  private seq = 0;
  private statusToast: ToastHandle | null = null;

  toast(msg: string, type: ToastType = 'info', ms = 3500): ToastHandle {
    const id = ++this.seq;
    this.toasts.update((l) => [...l, { id, msg, type, in: false }]);
    // Entrada animada en el siguiente frame
    requestAnimationFrame(() => this.patch(id, true));
    let killed = false;
    const kill = () => {
      if (killed) return;
      killed = true;
      this.dismiss(id);
    };
    if (ms) setTimeout(kill, ms);
    return { kill };
  }

  /** Cierra un aviso (también al pulsarlo) */
  dismiss(id: number): void {
    this.patch(id, false);
    setTimeout(() => this.toasts.update((l) => l.filter((t) => t.id !== id)), 250);
  }

  /** Estado de una operación: «Guardando…» se sustituye por el resultado */
  status(msg: string, ok = false): void {
    this.statusToast?.kill();
    this.statusToast = null;
    if (!msg) return;
    if (ok) this.toast(msg, 'success');
    else this.statusToast = this.toast(msg, 'info', 8000);
  }

  /** Error o dato que falta en un formulario */
  alert(msg: string): void {
    this.toast(String(msg), 'error', 6000);
  }

  private patch(id: number, on: boolean): void {
    this.toasts.update((l) => l.map((t) => (t.id === id ? { ...t, in: on } : t)));
  }
}

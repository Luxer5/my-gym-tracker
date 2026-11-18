import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TrainingStore } from './core/state/training-store';
import { LoginComponent } from './features/login/login.component';
import { ShellComponent } from './features/shell/shell.component';
import { ConfirmDialogComponent } from './shared/confirm-dialog.component';
import { ToastsComponent } from './shared/toasts.component';

/** Raíz: pantalla de acceso o aplicación según la sesión, más los avisos y el diálogo de confirmación */
@Component({
  selector: 'app-root',
  imports: [LoginComponent, ShellComponent, ToastsComponent, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<a class="skip-link" href="#main">Saltar al contenido</a>
    @if (store.user() === undefined) {
      <div class="screen-center" role="status">
        <div class="spinner" aria-hidden="true"></div>
        <div class="loading-text">Cargando…</div>
      </div>
    } @else if (store.user() === null) {
      <app-login />
    } @else {
      <app-shell />
    }
    <app-toasts />
    <app-confirm-dialog />`,
})
export class App {
  protected readonly store = inject(TrainingStore);
}

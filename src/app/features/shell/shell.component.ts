import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthGateway } from '../../core/auth/auth-gateway';
import { NotifyService } from '../../core/services/notify.service';
import { SECTIONS } from '../sections';

/** Estructura de la aplicación con sesión: cabecera, pestañas de las secciones y pantalla activa */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  private readonly auth = inject(AuthGateway);
  private readonly notify = inject(NotifyService);
  protected readonly user = this.auth.user;
  protected readonly sections = SECTIONS;

  protected async signOut(): Promise<void> {
    try {
      await this.auth.signOut();
    } catch (e) {
      this.notify.alert('Error al cerrar sesión: ' + (e as Error).message);
    }
  }
}

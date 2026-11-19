import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  inject,
  viewChild,
  viewChildren,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthGateway } from '../../core/auth/auth-gateway';
import { NotifyService } from '../../core/services/notify.service';
import { IconComponent } from '../../shared/icon.component';
import { SECTIONS } from '../sections';

/** «/carreras/c2?x» → «carreras» */
const sectionOf = (url: string): string => url.split(/[/?#]/)[1] ?? '';

/**
 * Estructura de la aplicación con sesión: cabecera, pestañas de las secciones y pantalla activa.
 * La píldora de la pestaña activa se desliza hasta la nueva al cambiar de sección.
 */
@Component({
  selector: 'app-shell',
  imports: [IconComponent, RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  private readonly auth = inject(AuthGateway);
  private readonly notify = inject(NotifyService);
  private readonly router = inject(Router);
  protected readonly user = this.auth.user;
  protected readonly sections = SECTIONS;

  private readonly nav = viewChild<ElementRef<HTMLElement>>('nav');
  private readonly tabs = viewChildren<ElementRef<HTMLElement>>('tab');
  /** Sección de la ruta activa */
  private readonly section = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => sectionOf(e.urlAfterRedirects)),
    ),
    { initialValue: sectionOf(this.router.url) },
  );

  constructor() {
    afterRenderEffect(() => {
      this.section();
      this.tabs();
      this.placePill();
    });
    // Si cambia el ancho (giro del móvil, fuentes que terminan de cargar) se recoloca
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const nav = this.nav()?.nativeElement;
      if (!nav || typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(() => this.placePill());
      ro.observe(nav);
      destroyRef.onDestroy(() => ro.disconnect());
    });
  }

  /** Coloca la píldora bajo la pestaña activa; la primera vez sin animación */
  private placePill(): void {
    const nav = this.nav()?.nativeElement;
    if (!nav) return;
    const i = this.sections.findIndex((s) => s.key === this.section());
    const tab = this.tabs()[i]?.nativeElement;
    if (!tab) {
      nav.classList.remove('has-pill');
      return;
    }
    nav.style.setProperty('--pill-x', `${tab.offsetLeft}px`);
    nav.style.setProperty('--pill-w', `${tab.offsetWidth}px`);
    if (nav.classList.contains('has-pill')) return;
    nav.classList.add('has-pill');
    if (typeof requestAnimationFrame === 'function')
      requestAnimationFrame(() => nav.classList.add('pill-ready'));
  }

  protected async signOut(): Promise<void> {
    try {
      await this.auth.signOut();
    } catch (e) {
      this.notify.alert('Error al cerrar sesión: ' + (e as Error).message);
    }
  }
}

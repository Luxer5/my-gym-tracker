import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

export const APP_NAME = 'GYM LOG';

/** Título de la pestaña del navegador según la pantalla: «Hyrox · GYM LOG» */
@Injectable({ providedIn: 'root' })
export class PageTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const name = this.buildTitle(snapshot);
    this.title.setTitle(name ? `${name} · ${APP_NAME}` : APP_NAME);
  }
}

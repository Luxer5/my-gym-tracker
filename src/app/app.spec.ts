import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { clickButton, settle, setupApp, teardownApp, textOf } from '../testing/feature-harness';
import { App } from './app';

describe('App', () => {
  afterEach(teardownApp);

  it('without session shows the login; signing in opens the app and signing out closes it', async () => {
    setupApp({ signedIn: false });
    const fixture = TestBed.createComponent(App);
    const el = fixture.nativeElement as HTMLElement;
    await settle();
    expect(el.querySelector('#screen-login')).not.toBeNull();

    clickButton(el, 'Continuar con Google');
    await settle();
    await TestBed.inject(Router).navigateByUrl('/');
    await settle();
    expect(el.querySelector('#screen-app')).not.toBeNull();
    expect(textOf(el.querySelector('.user-name'))).toBe('Atleta Demo');
    expect(el.querySelector('.tab-btn.active')?.textContent).toContain('Gym');
    expect(el.ownerDocument.title).toBe('Gym · GYM LOG');

    clickButton(el, 'Salir');
    await settle();
    expect(el.querySelector('#screen-login')).not.toBeNull();
  });

  it('the tabs navigate between screens', async () => {
    setupApp();
    const fixture = TestBed.createComponent(App);
    const el = fixture.nativeElement as HTMLElement;
    await TestBed.inject(Router).navigateByUrl('/gym');
    await settle(10);
    const hyroxTab = [...el.querySelectorAll<HTMLAnchorElement>('.tab-btn')].find((a) =>
      a.textContent?.includes('Hyrox'),
    )!;
    hyroxTab.click();
    await settle(10);
    expect(TestBed.inject(Router).url).toBe('/hyrox');
    expect(hyroxTab.getAttribute('aria-current')).toBe('page');
    expect(el.querySelector('#hyrox')).not.toBeNull();
  });
});

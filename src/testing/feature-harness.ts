import type { MockInstance } from 'vitest';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TitleStrategy, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app/app.routes';
import { AuthGateway } from '../app/core/auth/auth-gateway';
import { DEMO_SESSION_KEY } from '../app/core/auth/memory-auth-gateway';
import { MemoryTrainingRepository } from '../app/core/data/memory-training-repository';
import { TrainingRepository } from '../app/core/data/training-repository';
import { provideBackend } from '../app/core/providers';
import { ConfirmRequest, ConfirmService } from '../app/core/services/confirm.service';
import { NotifyService } from '../app/core/services/notify.service';
import { PageTitleStrategy } from '../app/core/services/page-title.strategy';
import { TrainingStore } from '../app/core/state/training-store';

/** Instante fijo de los tests: 7 oct 2026, 10:00 hora local */
export const NOW = new Date(2026, 9, 7, 10, 0);
export const TODAY = '2026-10-07';

export interface AppCtx {
  repo: MemoryTrainingRepository;
  store: TrainingStore;
  notify: NotifyService;
  confirm: ConfirmService;
  alert: MockInstance<(msg: string) => void>;
  status: MockInstance<(msg: string, ok?: boolean) => void>;
}

/**
 * Configura TestBed con el backend en memoria (datos de demo) y el router de la app.
 * `signedIn` = sesión iniciada al arrancar (por defecto sí).
 */
export function setupApp(opts: { signedIn?: boolean } = {}): AppCtx {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  try {
    sessionStorage.setItem(DEMO_SESSION_KEY, opts.signedIn === false ? '0' : '1');
  } catch {
    /* sin almacenamiento */
  }
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  // jsdom no tiene canvas: Chart.js no llega a pintar (las configuraciones se comprueban aparte)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter(routes, withComponentInputBinding()),
      ...provideBackend('memory'),
      { provide: TitleStrategy, useExisting: PageTitleStrategy },
    ],
  });
  const notify = TestBed.inject(NotifyService);
  return {
    repo: TestBed.inject(TrainingRepository) as MemoryTrainingRepository,
    store: TestBed.inject(TrainingStore),
    notify,
    confirm: TestBed.inject(ConfirmService),
    alert: vi.spyOn(notify, 'alert'),
    status: vi.spyOn(notify, 'status'),
  };
}

export function teardownApp(): void {
  vi.useRealTimers();
  vi.restoreAllMocks();
  try {
    sessionStorage.clear();
  } catch {
    /* sin almacenamiento */
  }
}

/** Deja pasar las escrituras/lecturas asíncronas del backend en memoria y refresca la vista */
export async function settle(turns = 6): Promise<void> {
  for (let i = 0; i < turns; i++) {
    await new Promise<void>((r) => setTimeout(r, 0));
    TestBed.tick();
  }
}

/**
 * Espera a que se cumpla una condición (navegaciones con carga diferida, escrituras encadenadas):
 * más fiable que un número fijo de vueltas cuando el equipo va cargado
 */
export async function until(cond: () => boolean, turns = 100): Promise<void> {
  for (let i = 0; i < turns && !cond(); i++) await settle(1);
  if (!cond()) throw new Error('La condición no llegó a cumplirse');
}

/** Espera a que la sesión esté lista y los datos (ejercicios, Hyrox, tests de carrera y carreras) cargados */
export async function waitForData(store: TrainingStore): Promise<void> {
  TestBed.inject(AuthGateway);
  const loaded = () =>
    store.exercisesLoaded() && store.hyroxLoaded() && store.runTestsLoaded() && store.racesLoaded();
  for (let i = 0; i < 50 && !loaded(); i++) await settle(1);
  if (!store.exercisesLoaded()) throw new Error('Los datos no llegaron a cargarse');
  await settle();
}

/** Arranca la app con sesión y navega a una URL; devuelve el elemento de la pantalla */
export async function openRoute(
  ctx: AppCtx,
  url: string,
): Promise<{ harness: RouterTestingHarness; el: HTMLElement }> {
  await waitForData(ctx.store);
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  await settle();
  return { harness, el: harness.routeNativeElement as HTMLElement };
}

/** Espera a que se pida una confirmación y la responde; devuelve lo que se preguntó */
export async function answerConfirm(confirm: ConfirmService, ok: boolean): Promise<ConfirmRequest> {
  for (let i = 0; i < 50 && !confirm.current(); i++) await settle(1);
  const req = confirm.current();
  if (!req) throw new Error('No se pidió confirmación');
  req.resolve(ok);
  await settle();
  return req;
}

/** Escribe en un campo de formulario como lo haría el usuario */
export function type(el: HTMLElement, selector: string, value: string): void {
  const input = el.querySelector<HTMLInputElement | HTMLSelectElement>(selector);
  if (!input) throw new Error(`No existe ${selector}`);
  input.value = value;
  input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input'));
  TestBed.tick();
}

/** Pulsa el primer botón cuyo texto contiene `text` (dentro de `el`) */
export function clickButton(el: ParentNode, text: string): void {
  const btn = [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
    b.textContent?.includes(text),
  );
  if (!btn) throw new Error(`No hay botón «${text}»`);
  btn.click();
  TestBed.tick();
}

/** Texto visible normalizado (espacios colapsados) */
export const textOf = (el: Element | null | undefined): string =>
  (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

/** Texto de una fila (o de cualquier contenedor) uniendo el de cada hijo con un espacio */
export const rowText = (el: Element | null | undefined): string =>
  [...(el?.children ?? [])]
    .map((c) => textOf(c))
    .filter(Boolean)
    .join(' ');

/** Cifras de una barra de resumen: «3 Ejercicios», «2 PRs»… */
export const summaryOf = (el: ParentNode, selector: string): string[] =>
  [...el.querySelectorAll(`${selector} .summary-item`)].map(
    (it) =>
      `${textOf(it.querySelector('.summary-val'))} ${textOf(it.querySelector('.summary-lbl'))}`,
  );

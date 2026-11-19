import { Directive, ElementRef, OnDestroy, effect, inject, input, untracked } from '@angular/core';
import { prefersReducedMotion } from './motion';

/** Desaceleración: rápida al salir y suave al llegar (easeOutCubic) */
const easeOut = (t: number): number => 1 - (1 - t) ** 3;

/** Los cambios posteriores al primero (un deslizador, un dato nuevo) tardan como mucho esto */
const UPDATE_MS = 380;

/**
 * Cifra que cuenta hasta su valor, como un cronómetro:
 * `<span [appCountUp]="r.totalSec" [countFormat]="fmtDuration"></span>`.
 * La primera vez sube desde 0; después pasa de lo que se ve al valor nuevo (se puede interrumpir:
 * un cambio a mitad parte de la cifra que hay en pantalla). Con movimiento reducido, o sin
 * requestAnimationFrame (jsdom), pinta el valor final directamente.
 */
@Directive({ selector: '[appCountUp]' })
export class CountUpDirective implements OnDestroy {
  readonly appCountUp = input.required<number>();
  readonly countFormat = input<(n: number) => string>((n) => String(n));
  /** Duración de la primera cuenta, en ms */
  readonly countDuration = input(900);

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private shown: number | null = null;
  private frame = 0;

  constructor() {
    effect(() => {
      const to = this.appCountUp();
      const fmt = this.countFormat();
      const ms = this.countDuration();
      untracked(() => this.run(to, fmt, ms));
    });
  }

  private run(to: number, fmt: (n: number) => string, ms: number): void {
    this.stop();
    const from = this.shown ?? 0;
    const duration = this.shown === null ? ms : Math.min(ms, UPDATE_MS);
    if (from === to || prefersReducedMotion()) {
      this.paint(to, fmt);
      return;
    }
    this.paint(from, fmt);
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      this.paint(Math.round(from + (to - from) * easeOut(t)), fmt);
      this.frame = t < 1 ? requestAnimationFrame(step) : 0;
    };
    this.frame = requestAnimationFrame(step);
  }

  private paint(value: number, fmt: (n: number) => string): void {
    this.shown = value;
    this.el.nativeElement.textContent = fmt(value);
  }

  private stop(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  ngOnDestroy(): void {
    this.stop();
  }
}

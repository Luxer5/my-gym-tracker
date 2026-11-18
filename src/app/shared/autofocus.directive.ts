import { Directive, ElementRef, afterNextRender, inject } from '@angular/core';

/** Pone el foco en el elemento al pintarse (el primer campo de un formulario modal) */
@Directive({ selector: '[appAutofocus]' })
export class AutofocusDirective {
  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef);
    afterNextRender(() => el.nativeElement.focus());
  }
}

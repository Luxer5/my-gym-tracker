import { DOCUMENT } from '@angular/common';
import { IconComponent } from '../../shared/icon.component';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NotifyService } from '../../core/services/notify.service';
import { parseDuration } from '../../domain/format';
import { RACE_DIVISIONS, RACE_STATIONS } from '../../domain/race';
import { bookmarkletCode, decodeImportPayload } from '../../domain/race-bookmarklet';
import { RaceForm, emptyRaceForm, formSplits, parsedToForm } from '../../domain/race-forms';
import { ParsedRace, parseRaceText } from '../../domain/race-import';
import { FORMAT_PIPES } from '../../shared/format.pipes';
import { RaceActions } from './race-actions.service';

/** Web oficial de resultados (el usuario busca allí su carrera y copia su ficha) */
export const OFFICIAL_RESULTS_URL = 'https://results.hyrox.com/';

/**
 * Importar una carrera: el usuario abre su resultado en la web oficial y pulsa el marcador
 * «Importar en GYM LOG» (llega aquí con el texto de la ficha en `#hyrox=…`) o lo copia y lo pega.
 * La app lee los tramos y los deja en un formulario para revisarlos antes de guardar (también sirve
 * para meter una carrera a mano).
 */
@Component({
  selector: 'app-race-import',
  imports: [IconComponent, RouterLink, ...FORMAT_PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './race-import.component.html',
})
export class RaceImportComponent {
  private readonly actions = inject(RaceActions);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notify = inject(NotifyService);
  private readonly doc = inject(DOCUMENT);

  protected readonly officialUrl = OFFICIAL_RESULTS_URL;
  protected readonly stations = RACE_STATIONS;
  protected readonly divisions = RACE_DIVISIONS;

  /** Código del marcador para esta instalación (se arrastra a la barra de marcadores) */
  private readonly bookmarklet = bookmarkletCode(this.doc.location.origin);
  /** Angular bloquea los enlaces `javascript:`; este es nuestro, constante y no viene del usuario */
  protected readonly bookmarkletHref = inject(DomSanitizer).bypassSecurityTrustUrl(
    this.bookmarklet,
  );

  /** Texto del cuadro de pegar (también lo rellena el marcador) */
  protected readonly pasteText = signal('');
  /** La ficha llegó con el marcador */
  protected readonly fromBookmarklet = signal(false);
  protected readonly parsed = signal<ParsedRace | null>(null);
  protected readonly form = signal<RaceForm | null>(null);
  protected readonly saving = signal(false);

  /** Suma de los tramos escritos y total resultante (ayuda bajo el campo «Total») */
  protected readonly splits = computed(() => {
    const f = this.form();
    return f ? formSplits(f) : null;
  });
  protected readonly computedTotal = computed(() => {
    const f = this.form();
    const s = this.splits();
    if (!f || !s?.complete) return null;
    return s.sum + (parseDuration(f.roxzone) ?? 0);
  });

  constructor() {
    // Llegada desde el marcador: se lee la ficha y se limpia la dirección (no queda en el historial)
    const text = decodeImportPayload(this.route.snapshot.fragment);
    if (text !== null) {
      this.fromBookmarklet.set(true);
      this.onPaste(text);
      void this.router.navigate([], { relativeTo: this.route, replaceUrl: true });
    }
  }

  protected val(e: Event): string {
    return (e.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  /** El marcador no se pulsa aquí: se arrastra a la barra de marcadores */
  protected bookmarkletClick(e: Event): void {
    e.preventDefault();
    this.notify.toast('Arrastra el botón a tu barra de marcadores; se pulsa en tu ficha oficial.');
  }

  /** Para instalarlo en el móvil: el código se pega como dirección de un marcador */
  protected async copyBookmarklet(): Promise<void> {
    try {
      await this.doc.defaultView?.navigator.clipboard.writeText(this.bookmarklet);
      this.notify.toast('Código del marcador copiado ✓', 'success');
    } catch {
      this.notify.alert(
        'No se pudo copiar. Mantén pulsado el botón del marcador y copia el enlace.',
      );
    }
  }

  /** Cada cambio en el cuadro de pegar se vuelve a leer y rellena el formulario */
  protected onPaste(text: string): void {
    this.pasteText.set(text);
    if (!text.trim()) {
      this.parsed.set(null);
      return;
    }
    const p = parseRaceText(text);
    this.parsed.set(p);
    if (p.found) this.form.set(parsedToForm(p));
  }

  protected manual(): void {
    this.form.set(emptyRaceForm());
  }

  protected patch(p: Partial<RaceForm>): void {
    this.form.update((f) => (f ? { ...f, ...p } : f));
  }

  protected setRun(i: number, value: string): void {
    this.form.update((f) => (f ? { ...f, runs: f.runs.map((v, k) => (k === i ? value : v)) } : f));
  }

  protected setStation(i: number, value: string): void {
    this.form.update((f) =>
      f ? { ...f, stations: f.stations.map((v, k) => (k === i ? value : v)) } : f,
    );
  }

  protected async save(e: Event): Promise<void> {
    e.preventDefault();
    const f = this.form();
    if (!f || this.saving()) return;
    this.saving.set(true);
    const id = await this.actions.save(f);
    this.saving.set(false);
    if (id) await this.router.navigate(['/carreras', id]);
  }
}

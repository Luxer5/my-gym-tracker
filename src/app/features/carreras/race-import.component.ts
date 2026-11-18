import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { parseDuration } from '../../domain/format';
import { RACE_DIVISIONS, RACE_STATIONS } from '../../domain/race';
import { RaceForm, emptyRaceForm, formSplits, parsedToForm } from '../../domain/race-forms';
import { ParsedRace, parseRaceText } from '../../domain/race-import';
import { FORMAT_PIPES } from '../../shared/format.pipes';
import { RaceActions } from './race-actions.service';

/** Web oficial de resultados (el usuario busca allí su carrera y copia su ficha) */
export const OFFICIAL_RESULTS_URL = 'https://results.hyrox.com/';

/**
 * Importar una carrera: el usuario abre su resultado en la web oficial, lo copia y lo pega aquí.
 * La app lee los tramos y los deja en un formulario para revisarlos antes de guardar (también sirve
 * para meter una carrera a mano).
 */
@Component({
  selector: 'app-race-import',
  imports: [RouterLink, ...FORMAT_PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './race-import.component.html',
})
export class RaceImportComponent {
  private readonly actions = inject(RaceActions);
  private readonly router = inject(Router);

  protected readonly officialUrl = OFFICIAL_RESULTS_URL;
  protected readonly stations = RACE_STATIONS;
  protected readonly divisions = RACE_DIVISIONS;

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

  protected val(e: Event): string {
    return (e.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  /** Cada cambio en el cuadro de pegar se vuelve a leer y rellena el formulario */
  protected onPaste(text: string): void {
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

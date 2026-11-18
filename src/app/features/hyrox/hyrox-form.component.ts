import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { HyroxForm, OTHER_PRESET, defaultPreset, emptyHyroxForm } from '../../domain/forms';
import { CUSTOM_STATION, HYROX_STATIONS, stationConfig } from '../../domain/hyrox';
import { ModalComponent } from '../../shared/modal.component';
import { HyroxActions } from './hyrox-actions.service';

/**
 * Ventana de nuevo test Hyrox. Según la estación se pide distancia, peso o nada (con valores
 * habituales y la opción de escribir otro); en «Otro» se escribe el nombre.
 */
@Component({
  selector: 'app-hyrox-form',
  imports: [ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hyrox-form.component.html',
})
export class HyroxFormComponent {
  private readonly actions = inject(HyroxActions);
  readonly closed = output<void>();

  protected readonly stations = HYROX_STATIONS;
  protected readonly OTHER = OTHER_PRESET;
  protected readonly form = signal<HyroxForm>(emptyHyroxForm());
  protected readonly saving = signal(false);

  protected readonly cfg = computed(() => stationConfig(this.form().station));
  protected readonly isCustomStation = computed(() => this.form().station === CUSTOM_STATION);
  protected readonly isOther = computed(() => this.form().preset === OTHER_PRESET);

  protected val(e: Event): string {
    return (e.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected patch(p: Partial<HyroxForm>): void {
    this.form.update((f) => ({ ...f, ...p }));
  }

  /** Al cambiar de estación se vuelve a su primer valor habitual */
  protected setStation(station: string): void {
    this.patch({ station, preset: defaultPreset(station), custom: '' });
  }

  protected async save(e: Event): Promise<void> {
    e.preventDefault();
    if (this.saving()) return;
    this.saving.set(true);
    const ok = await this.actions.addTest(this.form());
    this.saving.set(false);
    if (ok) this.closed.emit();
  }
}

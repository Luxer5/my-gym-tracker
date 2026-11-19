import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RunTestKind } from '../../core/models';
import { RunTestForm, emptyRunTestForm } from '../../domain/forms';
import { RUN_TEST_INFO } from '../../domain/run-tests';
import { ModalComponent } from '../../shared/modal.component';
import { HyroxActions } from './hyrox-actions.service';

/** Ventana para registrar un test de carrera: metros en 6' (VAM) o ritmo, FC y potencia (Jim Vance) */
@Component({
  selector: 'app-run-test-form',
  imports: [ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './run-test-form.component.html',
})
export class RunTestFormComponent implements OnInit {
  private readonly actions = inject(HyroxActions);
  readonly kind = input.required<RunTestKind>();
  readonly closed = output<void>();

  protected readonly info = computed(() => RUN_TEST_INFO[this.kind()]);
  protected readonly form = signal<RunTestForm>(emptyRunTestForm('vam'));
  protected readonly saving = signal(false);

  ngOnInit(): void {
    this.form.set(emptyRunTestForm(this.kind()));
  }

  protected val(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }

  protected patch(p: Partial<RunTestForm>): void {
    this.form.update((f) => ({ ...f, ...p }));
  }

  protected async save(e: Event): Promise<void> {
    e.preventDefault();
    if (this.saving()) return;
    this.saving.set(true);
    const ok = await this.actions.addRunTest(this.form());
    this.saving.set(false);
    if (ok) this.closed.emit();
  }
}

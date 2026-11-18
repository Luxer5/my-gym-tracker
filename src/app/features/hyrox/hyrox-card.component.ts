import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { HyroxGroup } from '../../domain/hyrox';
import { FORMAT_PIPES } from '../../shared/format.pipes';
import { HyroxActions } from './hyrox-actions.service';

/** Tarjeta de una estación + distancia/peso: mejor marca, mejora e historial de tests */
@Component({
  selector: 'app-hyrox-card',
  imports: [...FORMAT_PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hyrox-card.component.html',
})
export class HyroxCardComponent {
  private readonly actions = inject(HyroxActions);
  readonly group = input.required<HyroxGroup>();
  protected readonly historyOpen = signal(false);

  protected remove(id: string): void {
    void this.actions.deleteTest(id);
  }
}

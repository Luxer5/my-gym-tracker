import { TestBed } from '@angular/core/testing';
import { PASTE_DESKTOP } from '../../../testing/race-paste';
import {
  AppCtx,
  answerConfirm,
  setupApp,
  teardownApp,
  waitForData,
} from '../../../testing/feature-harness';
import { parsedToForm } from '../../domain/race-forms';
import { parseRaceText } from '../../domain/race-import';
import { RaceActions } from './race-actions.service';

describe('RaceActions', () => {
  let ctx: AppCtx;
  let svc: RaceActions;
  beforeEach(async () => {
    ctx = setupApp();
    await waitForData(ctx.store);
    svc = TestBed.inject(RaceActions);
  });
  afterEach(teardownApp);

  const form = () => parsedToForm(parseRaceText(PASTE_DESKTOP));

  it('saves a reviewed race and returns its id', async () => {
    const add = vi.spyOn(ctx.repo, 'addRace');
    const id = await svc.save(form());
    expect(id).toMatch(/^m\d+$/);
    expect(add.mock.calls[0][0]).toMatchObject({ event: 'HYROX Barcelona', totalSec: 4765 });
    expect(ctx.status).toHaveBeenLastCalledWith('HYROX Barcelona · 1:19:25 guardada ✓', true);
  });

  it('validates before writing', async () => {
    const add = vi.spyOn(ctx.repo, 'addRace');
    expect(await svc.save({ ...form(), event: '' })).toBeNull();
    expect(ctx.alert).toHaveBeenCalledWith('Escribe el nombre de la carrera.');
    expect(add).not.toHaveBeenCalled();
  });

  it('reports write errors', async () => {
    vi.spyOn(ctx.repo, 'addRace').mockRejectedValue(new Error('sin red'));
    expect(await svc.save(form())).toBeNull();
    expect(ctx.alert).toHaveBeenCalledWith('Error: sin red');
  });

  it('deletes after a destructive confirmation', async () => {
    const del = vi.spyOn(ctx.repo, 'deleteRace');
    const p = svc.remove('c1');
    const req = await answerConfirm(ctx.confirm, true);
    expect(await p).toBe(true);
    expect(req).toMatchObject({
      title: 'Eliminar carrera',
      message: '¿Eliminar HYROX Valencia (1:27:20) y todos sus tramos?',
      danger: true,
    });
    expect(del).toHaveBeenCalledWith('c1');
  });

  it('cancelling keeps it; unknown ids are ignored', async () => {
    const del = vi.spyOn(ctx.repo, 'deleteRace');
    const p = svc.remove('c1');
    await answerConfirm(ctx.confirm, false);
    expect(await p).toBe(false);
    expect(await svc.remove('nope')).toBe(false);
    expect(del).not.toHaveBeenCalled();
  });
});

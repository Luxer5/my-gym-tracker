import { TestBed } from '@angular/core/testing';
import {
  AppCtx,
  TODAY,
  answerConfirm,
  setupApp,
  teardownApp,
  waitForData,
} from '../../../testing/feature-harness';
import { emptyHyroxForm } from '../../domain/forms';
import { HyroxActions } from './hyrox-actions.service';

describe('HyroxActions', () => {
  let ctx: AppCtx;
  let svc: HyroxActions;
  beforeEach(async () => {
    ctx = setupApp();
    await waitForData(ctx.store);
    svc = TestBed.inject(HyroxActions);
  });
  afterEach(teardownApp);

  it('validates before writing', async () => {
    const add = vi.spyOn(ctx.repo, 'addHyrox');
    expect(await svc.addTest({ ...emptyHyroxForm(), sec: '75' })).toBe(false);
    expect(ctx.alert).toHaveBeenCalledWith('Los segundos van de 0 a 59.');
    expect(add).not.toHaveBeenCalled();
  });

  it('saves a test', async () => {
    const add = vi.spyOn(ctx.repo, 'addHyrox');
    const ok = await svc.addTest({
      ...emptyHyroxForm(),
      station: 'RowErg',
      preset: '2000',
      min: '7',
      sec: '5',
    });
    expect(ok).toBe(true);
    expect(add).toHaveBeenCalledWith({
      station: 'RowErg',
      param: 2000,
      totalSec: 425,
      date: TODAY,
      note: '',
    });
    expect(ctx.status).toHaveBeenLastCalledWith('RowErg · 07:05 guardado ✓', true);
  });

  it('deletes after confirming', async () => {
    const del = vi.spyOn(ctx.repo, 'deleteHyrox');
    const p = svc.deleteTest('h1');
    const req = await answerConfirm(ctx.confirm, true);
    expect(await p).toBe(true);
    expect(req.message).toBe('¿Eliminar el test de SkiErg (03:48)?');
    expect(del).toHaveBeenCalledWith('h1');
  });

  it('cancelling keeps it; unknown ids are ignored', async () => {
    const del = vi.spyOn(ctx.repo, 'deleteHyrox');
    const p = svc.deleteTest('h1');
    await answerConfirm(ctx.confirm, false);
    expect(await p).toBe(false);
    expect(await svc.deleteTest('nope')).toBe(false);
    expect(del).not.toHaveBeenCalled();
  });
});

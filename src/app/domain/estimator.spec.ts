import { demoData } from '../core/data/demo-data';
import {
  RANGE_FACTORS,
  baseAdjustment,
  estimate,
  estimateRows,
  sliderRange,
  valuesFromRace,
} from './estimator';

const madrid = demoData().races[1];

describe('estimator', () => {
  it('starts from the race: running total, Roxzone and the 8 stations', () => {
    expect(valuesFromRace(madrid)).toEqual({
      run: 2333,
      rox: 398,
      stations: [262, 186, 241, 361, 270, 118, 305, 401],
    });
  });

  it('the estimate of the untouched values is the race time', () => {
    const e = estimate(valuesFromRace(madrid));
    expect(e).toEqual({ total: 4875, run: 2333, rox: 398, stations: 2144, pace: 291.625 });
    expect(e.total).toBe(madrid.totalSec);
  });

  it('moving a slider changes the total by the same amount', () => {
    const v = valuesFromRace(madrid);
    const faster = {
      ...v,
      run: v.run - 60,
      stations: v.stations.map((s, i) => (i === 7 ? s - 30 : s)),
    };
    expect(estimate(faster).total).toBe(4875 - 90);
  });

  it('baseAdjustment absorbs the rounding between the official total and the splits', () => {
    expect(baseAdjustment(madrid)).toBe(0);
    expect(baseAdjustment({ ...madrid, totalSec: 4881 })).toBe(6);
  });

  it('slider ranges around the base value', () => {
    expect(sliderRange(2333, RANGE_FACTORS.run, 5)).toEqual({ min: 1865, max: 2685, step: 5 });
    expect(sliderRange(398, RANGE_FACTORS.rox, 5)).toEqual({ min: 155, max: 600, step: 5 });
    expect(sliderRange(118, RANGE_FACTORS.station)).toEqual({ min: 70, max: 154, step: 1 });
    // Nunca un rango vacío ni por debajo de un paso
    expect(sliderRange(0, RANGE_FACTORS.rox, 5)).toEqual({ min: 5, max: 10, step: 5 });
  });

  it('rows compare every segment with the base race', () => {
    const base = valuesFromRace(madrid);
    const rows = estimateRows(base, { ...base, rox: 350 });
    expect(rows.map((r) => r.label)).toEqual([
      'Running',
      'SkiErg',
      'Sled Push',
      'Sled Pull',
      'Burpee Broad Jump',
      'Row',
      "Farmer's Carry",
      'Sandbag Lunges',
      'Wall Balls',
      'Roxzone',
    ]);
    expect(rows.at(-1)).toEqual({ label: 'Roxzone', base: 398, value: 350, delta: -48 });
    expect(rows[0].delta).toBe(0);
  });
});

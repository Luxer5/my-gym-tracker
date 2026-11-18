import { ExerciseWithRecords, LiftRecord } from '../core/models';
import {
  ALL,
  bestOfType,
  byDateDesc,
  categoryFilters,
  filterByCategory,
  gymSummary,
  lastRecordDate,
  recordBoxes,
} from './records';

const rec = (id: string, type: LiftRecord['type'], value: number, date: string): LiftRecord => ({
  id,
  type,
  value,
  date,
  note: '',
});

const ex = (id: string, category: string, records: LiftRecord[] = []): ExerciseWithRecords => ({
  id,
  name: id,
  category,
  unit: 'kg',
  createdAt: '2026-01-01T00:00:00.000Z',
  records,
});

describe('records', () => {
  const records = [
    rec('r1', 'PR', 100, '2026-09-01'),
    rec('r2', 'PR', 110, '2026-10-01'),
    rec('r3', '5RM', 80, '2026-08-15'),
    rec('r4', '5RM', 85, '2026-07-01'),
  ];

  it('bestOfType picks the heaviest record of that type', () => {
    expect(bestOfType(records, 'PR')?.id).toBe('r2');
    expect(bestOfType(records, '5RM')?.id).toBe('r4');
    expect(bestOfType(records, '3RM')).toBeNull();
    expect(bestOfType([], 'PR')).toBeNull();
  });

  it('a tie keeps the first record found', () => {
    expect(
      bestOfType([rec('a', 'PR', 100, '2026-01-01'), rec('b', 'PR', 100, '2026-02-01')], 'PR')?.id,
    ).toBe('a');
  });

  it('recordBoxes returns the four types in order, PR highlighted', () => {
    const boxes = recordBoxes(records);
    expect(boxes.map((b) => b.type)).toEqual(['PR', '1RM', '3RM', '5RM']);
    expect(boxes.map((b) => b.best?.value ?? null)).toEqual([110, null, null, 85]);
    expect(boxes.filter((b) => b.isPR).map((b) => b.type)).toEqual(['PR']);
  });

  it('byDateDesc sorts newest first without mutating', () => {
    const copy = [...records];
    expect(byDateDesc(records).map((r) => r.id)).toEqual(['r2', 'r1', 'r3', 'r4']);
    expect(records).toEqual(copy);
  });

  it('lastRecordDate', () => {
    expect(lastRecordDate(records)).toBe('2026-10-01');
    expect(lastRecordDate([])).toBeNull();
  });

  it('gymSummary counts exercises, PRs and RMs', () => {
    expect(gymSummary([ex('a', 'Piernas', records), ex('b', 'Core')])).toEqual({
      exercises: 2,
      prs: 2,
      rms: 2,
    });
    expect(gymSummary([])).toEqual({ exercises: 0, prs: 0, rms: 0 });
  });

  it('category filters: «all» first, then unique categories in order', () => {
    const list = [ex('a', 'Piernas'), ex('b', 'Empuje'), ex('c', 'Piernas')];
    expect(categoryFilters(list)).toEqual([ALL, 'Piernas', 'Empuje']);
    expect(filterByCategory(list, 'Piernas').map((e) => e.id)).toEqual(['a', 'c']);
    expect(filterByCategory(list, ALL)).toHaveLength(3);
    expect(filterByCategory(list, 'Core')).toEqual([]);
  });
});

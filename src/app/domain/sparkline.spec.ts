import { sparkline } from './sparkline';

describe('sparkline', () => {
  it('needs at least two values', () => {
    expect(sparkline([], 100, 30)).toBeNull();
    expect(sparkline([5], 100, 30)).toBeNull();
  });

  it('spreads the points across the width and maps the highest value to the top', () => {
    const s = sparkline([10, 20, 15], 100, 30, { pad: 5 })!;
    expect(s.points).toEqual([
      { x: 5, y: 25 },
      { x: 50, y: 5 },
      { x: 95, y: 15 },
    ]);
    expect(s.line).toBe('M5 25 L50 5 L95 15');
    expect(s.area).toBe('M5 25 L50 5 L95 15 L95 30 L5 30 Z');
  });

  it('invert: lower is better, so the lowest value goes to the top', () => {
    const s = sparkline([241, 228], 100, 30, { pad: 5, invert: true })!;
    expect(s.points.map((p) => p.y)).toEqual([25, 5]);
  });

  it('a flat series runs through the middle', () => {
    const s = sparkline([60, 60, 60], 90, 20, { pad: 0 })!;
    expect(s.points.map((p) => p.y)).toEqual([10, 10, 10]);
  });
});

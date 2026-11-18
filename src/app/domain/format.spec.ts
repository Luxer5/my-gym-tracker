import {
  fmtDelta,
  fmtDmy,
  fmtDuration,
  fmtGap,
  fmtPace,
  fmtSplit500,
  fmtTime,
  num,
  parseDuration,
  plural,
  todayIso,
} from './format';

describe('format', () => {
  it('todayIso uses the local day, not the UTC one', () => {
    // 00:30 hora local del 8 de octubre: en UTC (Madrid, +2) aún sería el día 7
    expect(todayIso(new Date(2026, 9, 8, 0, 30))).toBe('2026-10-08');
    expect(todayIso(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('fmtDmy formats ISO dates as dd/mm/yyyy', () => {
    expect(fmtDmy('2026-10-07')).toBe('07/10/2026');
    expect(fmtDmy('')).toBe('');
    expect(fmtDmy(null)).toBe('');
    expect(fmtDmy('raro')).toBe('raro');
  });

  it('fmtTime formats seconds as mm:ss', () => {
    expect(fmtTime(0)).toBe('00:00');
    expect(fmtTime(65)).toBe('01:05');
    expect(fmtTime(3725)).toBe('62:05');
    expect(fmtTime(-3)).toBe('00:00');
  });

  it('fmtSplit500 formats the pace per 500 m', () => {
    expect(fmtSplit500(114)).toBe('1:54 /500 m');
    expect(fmtSplit500(112.5)).toBe('1:53 /500 m');
    expect(fmtSplit500(95)).toBe('1:35 /500 m');
  });

  it('fmtDuration switches to h:mm:ss from one hour', () => {
    expect(fmtDuration(262)).toBe('04:22');
    expect(fmtDuration(3599)).toBe('59:59');
    expect(fmtDuration(3600)).toBe('1:00:00');
    expect(fmtDuration(4875)).toBe('1:21:15');
  });

  it('fmtDelta shows the sign (real minus sign for faster)', () => {
    expect(fmtDelta(-12)).toBe('−0:12');
    expect(fmtDelta(65)).toBe('+1:05');
    expect(fmtDelta(0)).toBe('±0:00');
    expect(fmtDelta(-3725)).toBe('−1:02:05');
  });

  it('fmtGap says it in words', () => {
    expect(fmtGap(-110)).toBe('1:50 más rápido');
    expect(fmtGap(175)).toBe('2:55 más lento');
    expect(fmtGap(0.2)).toBe('mismo tiempo');
  });

  it('fmtPace', () => {
    expect(fmtPace(271)).toBe('4:31 /km');
    expect(fmtPace(300.4)).toBe('5:00 /km');
  });

  it('parseDuration accepts the usual ways of writing a time', () => {
    expect(parseDuration('4:12')).toBe(252);
    expect(parseDuration('04:12')).toBe(252);
    expect(parseDuration('00:04:12')).toBe(252);
    expect(parseDuration('1:21:15')).toBe(4875);
    expect(parseDuration('4.12')).toBe(252);
    expect(parseDuration(' 4:12.6 ')).toBe(253);
    expect(parseDuration('62:05')).toBe(3725);
  });

  it('parseDuration rejects anything else', () => {
    for (const bad of ['', '4', '4:7', '4:75', '1:75:00', 'abc', '12:34:56:78', null])
      expect(parseDuration(bad)).toBeUndefined();
  });

  it('plural', () => {
    expect(plural(1, 'test')).toBe('1 test');
    expect(plural(3, 'test')).toBe('3 tests');
  });

  it('num accepts decimal commas and rejects junk', () => {
    expect(num('82,5')).toBe(82.5);
    expect(num(' 100 ')).toBe(100);
    expect(num('')).toBeUndefined();
    expect(num('abc')).toBeUndefined();
    expect(num(7)).toBe(7);
    expect(num(NaN)).toBeUndefined();
    expect(num(null)).toBeUndefined();
  });
});

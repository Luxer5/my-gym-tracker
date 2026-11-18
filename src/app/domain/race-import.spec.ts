import {
  PASTE_DESKTOP,
  PASTE_EXPECTED,
  PASTE_MOBILE,
  PASTE_OFFICIAL,
} from '../../testing/race-paste';
import { cleanAthlete, eventName, parseRaceText } from './race-import';

const pick = (p: ReturnType<typeof parseRaceText>) => ({
  athlete: p.athlete,
  event: p.event,
  date: p.date,
  division: p.division,
  ageGroup: p.ageGroup,
  runs: p.runs,
  stations: p.stations,
  roxzoneSec: p.roxzoneSec,
  totalSec: p.totalSec,
  rankOverall: p.rankOverall,
  rankAgeGroup: p.rankAgeGroup,
});

describe('parseRaceText', () => {
  it('reads the desktop copy (tab-separated table)', () => {
    const p = parseRaceText(PASTE_DESKTOP);
    expect(pick(p)).toEqual(PASTE_EXPECTED);
    expect(p.found).toBe(16);
    expect(p.missing).toEqual([]);
    expect(p.warnings).toEqual([]);
  });

  it('reads the mobile copy (one cell per line, mm:ss times)', () => {
    const p = parseRaceText(PASTE_MOBILE);
    expect(pick(p)).toEqual(PASTE_EXPECTED);
    expect(p.warnings).toEqual([]);
  });

  it('reads rows separated by single spaces', () => {
    const p = parseRaceText(PASTE_DESKTOP.replace(/\t/g, ' '));
    expect(p.runs).toEqual(PASTE_EXPECTED.runs);
    expect(p.stations).toEqual(PASTE_EXPECTED.stations);
    expect(p.totalSec).toBe(PASTE_EXPECTED.totalSec);
    expect(p.rankAgeGroup).toBe(88);
  });

  it('ignores the Race Replay table (times of day and cumulative times)', () => {
    // Solo con la tabla Race Replay no hay tramos fiables
    const replayOnly = PASTE_DESKTOP.slice(PASTE_DESKTOP.indexOf('Race Replay'));
    const p = parseRaceText(replayOnly);
    expect(p.found).toBe(0);
    expect(p.warnings[0]).toContain('No encuentro los tiempos por tramo');
  });

  it('skips implausible values such as a time of day next to the label', () => {
    const p = parseRaceText('Running 1\t09:34:18\t00:04:18');
    expect(p.runs[0]).toBe(258);
  });

  it('lists what is missing', () => {
    const p = parseRaceText(PASTE_MOBILE.replace('Wall Balls\n06:29', ''));
    expect(p.found).toBe(15);
    expect(p.missing).toEqual(['Wall Balls']);
    expect(p.stations[7]).toBeNull();
  });

  it('warns when the splits do not add up to the total', () => {
    const p = parseRaceText(
      PASTE_DESKTOP.replace('Overall Time\t01:19:25', 'Overall Time\t01:25:00'),
    );
    expect(p.warnings).toEqual([
      'Los tramos y la Roxzone suman 1:19:25 pero el total es 1:25:00: revisa los tiempos.',
    ]);
  });

  it('warns when the splits alone exceed the total and there is no Roxzone', () => {
    const text = PASTE_MOBILE.replace('Roxzone\n06:25', '').replace('1:19:25', '1:00:00');
    expect(parseRaceText(text).warnings[0]).toContain('más que el total (1:00:00)');
  });

  it('accepts label variants', () => {
    const p = parseRaceText(
      [
        'Run 1 4:18',
        'Ski Erg 4:15',
        'Burpees Broad Jumps 5:52',
        'RowErg 4:26',
        'Farmers Carry 1:55',
        'Lunges 4:58',
        '100 Wall Balls 6:29',
        'Rox Zone 6:25',
        'Rank (Overall) 512',
        'Finish Time 1:19:25',
      ].join('\n'),
    );
    expect(p.runs[0]).toBe(258);
    expect(p.stations).toEqual([255, null, null, 352, 266, 115, 298, 389]);
    expect(p.roxzoneSec).toBe(385);
    expect(p.rankOverall).toBe(512);
    expect(p.totalSec).toBe(4765);
  });

  it('"Run Total" and "Best Run Lap" are not taken as laps or as the total', () => {
    const p = parseRaceText('Run Total\t00:38:09\nBest Run Lap\t00:04:18');
    expect(p.runs.every((r) => r === null)).toBe(true);
    expect(p.totalSec).toBeNull();
  });

  it('empty text', () => {
    const p = parseRaceText('');
    expect(p.found).toBe(0);
    expect(p.date).toBe('');
  });

  it('reads the real official page layout (doubles, tabs above the table, no date)', () => {
    const p = parseRaceText(PASTE_OFFICIAL);
    expect(pick(p)).toEqual({
      ...PASTE_EXPECTED,
      athlete: 'Atleta Demo / Compañera Prueba',
      event: 'HYROX Barcelona 2026',
      date: '',
      division: 'HYROX DOUBLES - Saturday',
      totalSec: 4771,
      rankOverall: 210,
      rankAgeGroup: 41,
    });
    expect(p.found).toBe(16);
    // El redondeo de 6 s no es un error; la fecha sí hay que ponerla a mano
    expect(p.warnings).toEqual([
      'La ficha oficial no incluye la fecha de la carrera: indícala abajo.',
    ]);
  });

  it('"Race Details" is a heading, not the race name', () => {
    expect(parseRaceText('Race Details\nRace\t2026 Valencia').event).toBe('HYROX Valencia 2026');
    expect(eventName('HYROX Madrid')).toBe('HYROX Madrid');
  });

  it('without a "Name" label the athlete comes from the page title', () => {
    const p = parseRaceText(
      'HYROX - For Every Body: Atleta Demo\n' + PASTE_DESKTOP.replace(/^Name\t.*$/m, ''),
    );
    expect(p.athlete).toBe('Atleta Demo');
  });

  it('cleanAthlete turns "Surname, Name (NAT)" into "Name Surname"', () => {
    expect(cleanAthlete('Demo, Atleta (ESP)')).toBe('Atleta Demo');
    expect(cleanAthlete('Atleta Demo')).toBe('Atleta Demo');
  });
});

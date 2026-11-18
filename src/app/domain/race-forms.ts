import { NewHyroxRace } from '../core/models';
import { fmtTime, fmtDuration, parseDuration, todayIso } from './format';
import { FormResult } from './forms';
import { RACE_LAPS, RACE_STATIONS, runLabel } from './race';
import { ParsedRace } from './race-import';

/** Formulario de una carrera (revisión de lo importado o alta a mano). Los tiempos, como texto. */
export interface RaceForm {
  event: string;
  date: string;
  division: string;
  ageGroup: string;
  athlete: string;
  runs: string[];
  stations: string[];
  roxzone: string;
  total: string;
  rankOverall: string;
  rankAgeGroup: string;
  note: string;
}

const fail = <T>(error: string): FormResult<T> => ({ ok: false, error });
const empty8 = () => Array<string>(RACE_LAPS).fill('');
const timeText = (sec: number | null): string => (sec == null ? '' : fmtTime(sec));

export const emptyRaceForm = (now: Date = new Date()): RaceForm => ({
  event: '',
  date: todayIso(now),
  division: 'HYROX Men',
  ageGroup: '',
  athlete: '',
  runs: empty8(),
  stations: empty8(),
  roxzone: '',
  total: '',
  rankOverall: '',
  rankAgeGroup: '',
  note: '',
});

/** Lo leído del resultado pegado → formulario (lo que falta queda vacío para rellenarlo) */
export function parsedToForm(p: ParsedRace, now: Date = new Date()): RaceForm {
  const base = emptyRaceForm(now);
  return {
    ...base,
    event: p.event,
    date: p.date || base.date,
    division: p.division || base.division,
    ageGroup: p.ageGroup,
    athlete: p.athlete,
    runs: p.runs.map(timeText),
    stations: p.stations.map(timeText),
    roxzone: timeText(p.roxzoneSec),
    total: p.totalSec == null ? '' : fmtDuration(p.totalSec),
    rankOverall: p.rankOverall == null ? '' : String(p.rankOverall),
    rankAgeGroup: p.rankAgeGroup == null ? '' : String(p.rankAgeGroup),
  };
}

/** Suma de los tramos escritos (para la ayuda en vivo del formulario) */
export function formSplits(f: RaceForm): { sum: number; complete: boolean } {
  const values = [...f.runs, ...f.stations].map(parseDuration);
  return {
    sum: values.reduce<number>((s, v) => s + (v ?? 0), 0),
    complete: values.every((v) => v !== undefined && v > 0),
  };
}

const MAX_SPLIT = 30 * 60;

function rank(text: string): number | null | undefined {
  const t = text.trim().replace(/^#/, '');
  if (!t) return null;
  return /^\d{1,6}$/.test(t) && +t > 0 ? +t : undefined;
}

export function formToRace(f: RaceForm, now: Date = new Date()): FormResult<NewHyroxRace> {
  const event = f.event.trim();
  if (!event) return fail('Escribe el nombre de la carrera.');
  if (event.length > 100) return fail('El nombre de la carrera no puede pasar de 100 caracteres.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) return fail('Indica la fecha de la carrera.');
  for (const [text, max, name] of [
    [f.division, 50, 'La división'],
    [f.ageGroup, 20, 'El grupo de edad'],
    [f.athlete, 100, 'El nombre del atleta'],
    [f.note, 500, 'La nota'],
  ] as const)
    if (text.trim().length > max) return fail(`${name} no puede pasar de ${max} caracteres.`);

  const runs: number[] = [];
  const stations: number[] = [];
  for (let i = 0; i < RACE_LAPS; i++) {
    const r = parseDuration(f.runs[i]);
    if (!r || r > MAX_SPLIT) return fail(`Revisa el tiempo de ${runLabel(i)}.`);
    runs.push(r);
    const s = parseDuration(f.stations[i]);
    if (!s || s > MAX_SPLIT) return fail(`Revisa el tiempo de ${RACE_STATIONS[i].label}.`);
    stations.push(s);
  }
  const splits = [...runs, ...stations].reduce((a, b) => a + b, 0);

  const roxText = f.roxzone.trim();
  const rox = roxText ? parseDuration(roxText) : null;
  if (rox === undefined) return fail('Revisa el tiempo de la Roxzone.');
  const totalText = f.total.trim();
  const total = totalText ? parseDuration(totalText) : null;
  if (total === undefined) return fail('Revisa el tiempo total.');
  if (total != null && total < splits)
    return fail(`El total es menor que la suma de los tramos (${fmtDuration(splits)}).`);

  const rankOverall = rank(f.rankOverall);
  const rankAgeGroup = rank(f.rankAgeGroup);
  if (rankOverall === undefined || rankAgeGroup === undefined)
    return fail('La posición tiene que ser un número entero.');

  return {
    ok: true,
    data: {
      event,
      date: f.date,
      division: f.division.trim(),
      ageGroup: f.ageGroup.trim(),
      athlete: f.athlete.trim(),
      runs,
      stations,
      roxzoneSec: rox ?? (total != null ? total - splits : null),
      totalSec: total ?? splits + (rox ?? 0),
      rankOverall,
      rankAgeGroup,
      note: f.note.trim(),
      createdAt: now.toISOString(),
    },
  };
}

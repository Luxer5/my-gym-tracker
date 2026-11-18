import { fmtDuration, parseDuration } from './format';
import { RACE_LAPS, RACE_STATIONS, runLabel } from './race';

/**
 * Lectura del resultado oficial de una carrera copiado de results.hyrox.com y pegado en la app.
 *
 * No depende de la maquetación exacta: busca las etiquetas conocidas («Running 1», «1000m SkiErg»,
 * «Roxzone Time», «Overall Time», «Rank (AG)»…) y toma el primer tiempo verosímil que las sigue,
 * esté en la misma celda o en las siguientes (tabla con tabuladores, una celda por línea o todo con
 * espacios). La tabla «Race Replay» (horas del día y tiempos acumulados) se ignora. Lo que no se
 * encuentra queda vacío: el usuario lo revisa en el formulario antes de guardar.
 */
export interface ParsedRace {
  athlete: string;
  event: string;
  /** YYYY-MM-DD o vacío */
  date: string;
  division: string;
  ageGroup: string;
  runs: (number | null)[];
  stations: (number | null)[];
  roxzoneSec: number | null;
  totalSec: number | null;
  rankOverall: number | null;
  rankAgeGroup: number | null;
  /** Tramos encontrados (de 16) */
  found: number;
  /** Tramos que faltan, por su nombre */
  missing: string[];
  warnings: string[];
}

const DIST = String.raw`(?:\d+\s*(?:m|reps?)?\s+)?`;
const END = String.raw`(?=[\s:\d]|$)`;
const label = (body: string) => new RegExp(`^${DIST}(?:${body})${END}`, 'i');

const STATION_LABELS: RegExp[] = [
  label(String.raw`ski\s*-?\s*erg`),
  label(String.raw`sled\s*push`),
  label(String.raw`sled\s*pull`),
  label(String.raw`burpees?\s*broad\s*jumps?`),
  label(String.raw`row(?:ing|\s*erg)?`),
  label(String.raw`farmers?['’]?s?\s*carry`),
  label(String.raw`(?:sandbag\s*)?lunges?`),
  label(String.raw`wall\s*-?\s*balls?`),
];
const RUN_LABEL = /^(?:running|run|lauf(?:en)?|carrera)\s*#?\s*([1-8])(?=[\s:]|$)/i;
const ROXZONE_LABEL = /^rox\s*zone(?:\s*time)?(?=[\s:]|$)/i;
const TOTAL_LABEL =
  /^(?:overall\s*time|total\s*time|total|finish(?:\s*time)?|net\s*time|gesamtzeit|zielzeit|tiempo\s*total)(?=[\s:]|$)/i;
const RANK_OVERALL =
  /^(?:rank|place|platz|posici[oó]n)\s*\(?\s*(?:m\s*\/\s*w|overall|gender|total|division)\s*\)?/i;
const RANK_AG = /^(?:rank|place|platz|posici[oó]n)\s*\(?\s*(?:ag|age\s*group|ak)\s*\)?/i;
const META: Record<'athlete' | 'event' | 'division' | 'ageGroup', RegExp> = {
  // Palabra completa: «Participant» (cabecera de la ficha) no es la etiqueta del nombre
  athlete: /^(?:name|athlete|teilnehmer|nombre)\s*:?(?=\s|$)/i,
  event: /^(?:event|race|competition|veranstaltung|evento)\s*:?(?=\s|$)/i,
  division: /^(?:division|category|categor[ií]a|wertung)\s*:?(?=\s|$)/i,
  ageGroup: /^(?:age\s*group|altersklasse|grupo\s*de\s*edad)\s*:?(?=\s|$)/i,
};
const REPLAY_HEADING = /race\s*replay/i;
const TIME_TOKEN = /(?<![\d:])(\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d+)?(?![\d:])/;
const ANY_LABEL = [RUN_LABEL, ROXZONE_LABEL, TOTAL_LABEL, RANK_OVERALL, RANK_AG, ...STATION_LABELS];

/** Límites de verosimilitud (descartan horas del día y tiempos acumulados) */
const MAX_SPLIT = 30 * 60;
const MAX_ROXZONE = 60 * 60;
const MIN_TOTAL = 20 * 60;
const MAX_TOTAL = 5 * 3600;

/** Texto pegado → celdas en orden de lectura */
function toCells(text: string): string[] {
  return text
    .replace(/\u00a0/g, ' ')
    .split(/\r?\n/)
    .flatMap((line) => line.split(/\t|\s{2,}|\s*\|\s*/))
    .map((c) => c.trim())
    .filter(Boolean);
}

const isLabel = (cell: string) => ANY_LABEL.some((re) => re.test(cell));

/** Primer tiempo verosímil tras la etiqueta: en el resto de la celda o en las 3 siguientes */
function durationAfter(
  cells: string[],
  i: number,
  rest: string,
  max: number,
  min = 1,
): number | null {
  const candidates = [rest, ...cells.slice(i + 1, i + 4)];
  for (let k = 0; k < candidates.length; k++) {
    const c = candidates[k];
    if (k > 0 && isLabel(c)) break; // empieza otra fila
    const m = TIME_TOKEN.exec(c);
    if (!m) continue;
    const sec = parseDuration(m[0]);
    if (sec !== undefined && sec >= min && sec <= max) return sec;
  }
  return null;
}

/** Primer número entero tras la etiqueta (posiciones) */
function integerAfter(cells: string[], i: number, rest: string): number | null {
  for (const c of [rest, ...cells.slice(i + 1, i + 3)]) {
    if (TIME_TOKEN.test(c)) continue;
    const m = /^\s*#?\s*(\d{1,6})\b/.exec(c);
    if (m) return +m[1];
  }
  return null;
}

/** Texto tras la etiqueta: el resto de la celda o la celda siguiente */
function textAfter(cells: string[], i: number, rest: string): string {
  const t = rest.replace(/^\s*:?\s*/, '').trim() || (cells[i + 1] ?? '');
  const another = isLabel(t) || Object.values(META).some((re) => re.test(t));
  return another || TIME_TOKEN.test(t) ? '' : t.slice(0, 100);
}

/** «Demo, Atleta (ESP)» → «Atleta Demo» */
export function cleanAthlete(raw: string): string {
  const t = raw.replace(/\s*\([A-Z]{2,3}\)\s*$/, '').trim();
  const m = /^([^,]+),\s*(.+)$/.exec(t);
  return m ? `${m[2]} ${m[1]}` : t;
}

/** Primera fecha del texto (27.09.2026, 27/09/2026 o 2026-09-27) en ISO */
function findDate(cells: string[]): string {
  for (const c of cells) {
    const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(c);
    if (iso) return iso[0];
    const eu = /\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/.exec(c);
    if (eu && +eu[2] <= 12 && +eu[1] <= 31)
      return `${eu[3]}-${eu[2].padStart(2, '0')}-${eu[1].padStart(2, '0')}`;
  }
  return '';
}

export function parseRaceText(text: string): ParsedRace {
  const all = toCells(text);
  const replay = all.findIndex((c) => REPLAY_HEADING.test(c));
  const cells = replay >= 0 ? all.slice(0, replay) : all;

  const out: ParsedRace = {
    athlete: '',
    event: '',
    date: findDate(cells),
    division: '',
    ageGroup: '',
    runs: Array<number | null>(RACE_LAPS).fill(null),
    stations: Array<number | null>(RACE_LAPS).fill(null),
    roxzoneSec: null,
    totalSec: null,
    rankOverall: null,
    rankAgeGroup: null,
    found: 0,
    missing: [],
    warnings: [],
  };

  cells.forEach((cell, i) => {
    const run = RUN_LABEL.exec(cell);
    if (run) {
      const idx = +run[1] - 1;
      out.runs[idx] ??= durationAfter(cells, i, cell.slice(run[0].length), MAX_SPLIT);
      return;
    }
    const st = STATION_LABELS.findIndex((re) => re.test(cell));
    if (st >= 0) {
      const rest = cell.replace(STATION_LABELS[st], '');
      out.stations[st] ??= durationAfter(cells, i, rest, MAX_SPLIT);
      return;
    }
    let m: RegExpExecArray | null;
    if ((m = ROXZONE_LABEL.exec(cell))) {
      out.roxzoneSec ??= durationAfter(cells, i, cell.slice(m[0].length), MAX_ROXZONE);
    } else if ((m = TOTAL_LABEL.exec(cell))) {
      out.totalSec ??= durationAfter(cells, i, cell.slice(m[0].length), MAX_TOTAL, MIN_TOTAL);
    } else if ((m = RANK_AG.exec(cell))) {
      out.rankAgeGroup ??= integerAfter(cells, i, cell.slice(m[0].length));
    } else if ((m = RANK_OVERALL.exec(cell))) {
      out.rankOverall ??= integerAfter(cells, i, cell.slice(m[0].length));
    } else {
      for (const key of Object.keys(META) as (keyof typeof META)[]) {
        const meta = META[key].exec(cell);
        if (meta && !out[key]) {
          const value = textAfter(cells, i, cell.slice(meta[0].length));
          out[key] = key === 'athlete' ? cleanAthlete(value) : value;
          break;
        }
      }
    }
  });

  const names = [
    ...out.runs.map((v, i) => (v == null ? runLabel(i) : null)),
    ...out.stations.map((v, i) => (v == null ? RACE_STATIONS[i].label : null)),
  ];
  out.missing = names.filter((n): n is string => !!n);
  out.found = RACE_LAPS * 2 - out.missing.length;

  if (!out.found) {
    out.warnings.push(
      'No encuentro los tiempos por tramo. Copia la página completa de tu resultado (con la tabla de Running 1, SkiErg…).',
    );
  } else if (!out.missing.length && out.totalSec != null) {
    const splits = [...out.runs, ...out.stations].reduce<number>((s, v) => s + (v ?? 0), 0);
    if (out.roxzoneSec != null) {
      const diff = out.totalSec - splits - out.roxzoneSec;
      if (Math.abs(diff) > 5)
        out.warnings.push(
          `Los tramos y la Roxzone suman ${fmtDuration(splits + out.roxzoneSec)} pero el total es ${fmtDuration(out.totalSec)}: revisa los tiempos.`,
        );
    } else if (splits > out.totalSec) {
      out.warnings.push(
        `Los tramos suman ${fmtDuration(splits)}, más que el total (${fmtDuration(out.totalSec)}): revisa los tiempos.`,
      );
    }
  }
  return out;
}

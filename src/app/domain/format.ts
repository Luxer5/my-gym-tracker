const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * Fecha de hoy (YYYY-MM-DD) en la zona horaria local: un entreno a las 00:30 cuenta para ese día,
 * no para el anterior como pasaría con la fecha UTC.
 */
export const todayIso = (now: Date = new Date()): string =>
  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

/** 2026-10-07 → 07/10/2026 (vacío si no hay fecha) */
export const fmtDmy = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
};

/** Segundos → mm:ss (los minutos pueden pasar de 59: 3725 s → 62:05) */
export const fmtTime = (totalSec: number): string => {
  const s = Math.max(0, Math.round(totalSec));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
};

/** Segundos → h:mm:ss a partir de una hora (4875 s → 1:21:15), mm:ss por debajo (262 s → 04:22) */
export const fmtDuration = (totalSec: number): string => {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  return h ? `${h}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}` : fmtTime(s);
};

/** Diferencia con signo: −0:12 (más rápido), +1:05 (más lento), ±0:00 */
export const fmtDelta = (deltaSec: number): string => {
  const d = Math.round(deltaSec);
  if (!d) return '±0:00';
  const a = Math.abs(d);
  const body =
    a >= 3600
      ? `${Math.floor(a / 3600)}:${pad(Math.floor((a % 3600) / 60))}:${pad(a % 60)}`
      : `${Math.floor(a / 60)}:${pad(a % 60)}`;
  return `${d < 0 ? '−' : '+'}${body}`;
};

/** Diferencia en palabras: «1:50 más rápido», «2:55 más lento», «mismo tiempo» */
export const fmtGap = (deltaSec: number): string => {
  const d = Math.round(deltaSec);
  if (!d) return 'mismo tiempo';
  return `${fmtDelta(Math.abs(d)).slice(1)} más ${d < 0 ? 'rápido' : 'lento'}`;
};

/** Ritmo por kilómetro: 271 s → 4:31 /km */
export const fmtPace = (secPerKm: number): string => {
  const s = Math.max(0, Math.round(secPerKm));
  return `${Math.floor(s / 60)}:${pad(s % 60)} /km`;
};

/**
 * Duración escrita por el usuario → segundos. Admite «4:12», «04:12», «1:21:15», «00:04:12»,
 * con punto en vez de dos puntos («4.12») y décimas («4:12.3», se redondean). undefined si no vale.
 */
export const parseDuration = (text: string | null | undefined): number | undefined => {
  const t = String(text ?? '')
    .trim()
    .replace(/\s/g, '');
  const m = /^(?:(\d{1,2})[:.])?(\d{1,3})[:.](\d{2})(?:[.,](\d+))?$/.exec(t);
  if (!m) return undefined;
  const [, h, min, sec, frac] = m;
  if (+sec > 59 || (h !== undefined && +min > 59)) return undefined;
  const total = (h ? +h * 3600 : 0) + +min * 60 + +sec + (frac ? +`0.${frac}` : 0);
  return Math.round(total);
};

/** 1 test / 3 tests */
export const plural = (n: number, word: string, suffix = 's'): string =>
  `${n} ${word}${n === 1 ? '' : suffix}`;

/** Número escrito por el usuario (admite coma decimal); undefined si está vacío o no es número */
export const num = (text: string | number | null | undefined): number | undefined => {
  if (typeof text === 'number') return Number.isFinite(text) ? text : undefined;
  const t = String(text ?? '')
    .trim()
    .replace(',', '.');
  if (!t) return undefined;
  const v = Number(t);
  return Number.isFinite(v) ? v : undefined;
};

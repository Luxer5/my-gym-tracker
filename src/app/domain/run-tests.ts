import { RunTest, RunTestKind } from '../core/models';
import { fmtDelta, fmtKmh, fmtMinSec, fmtPace } from './format';

/**
 * Tests de carrera y sus zonas de entrenamiento, con las mismas fórmulas que Hyprogram:
 * - Test VAM: máxima distancia en 6 minutos. VAM (km/h) = km × 10; cada zona es un % de la VAM.
 * - Test de Jim Vance (30'): ritmo medio de los 30' (FTPa) y FC media de los últimos 20' (LTHR);
 *   las zonas son las de Joe Friel, como múltiplos del ritmo y de la FC de umbral.
 */

/** Duración del test VAM: 6 minutos */
export const VAM_TEST_SEC = 360;

export interface RunTestInfo {
  name: string;
  /** Nombre sin «Test»: título destacado de la ventana de registro */
  short: string;
  subtitle: string;
  /** Cómo se hace, paso a paso */
  protocol: readonly string[];
}

export const RUN_TEST_INFO: Record<RunTestKind, RunTestInfo> = {
  vam: {
    name: 'Test VAM',
    short: 'VAM',
    subtitle: 'Velocidad aeróbica máxima · 6 min',
    protocol: [
      'Calienta bien antes de empezar.',
      'Corre la máxima distancia posible en 6 minutos.',
      'No lo des todo en el primer minuto: mantén el ritmo más alto que puedas durante los 6.',
      'Anota la distancia en metros (reloj GPS o pista).',
    ],
  },
  vance30: {
    name: "Test Jim Vance 30'",
    short: "Jim Vance 30'",
    subtitle: 'Umbral funcional · 30 min',
    protocol: [
      'Calienta 15-20 minutos.',
      'Corre 30 minutos a la máxima intensidad que puedas sostener.',
      'Anota el ritmo medio de los 30 minutos (FTPa) y la FC media de los últimos 20 (LTHR); si corres con Stryd, también la potencia media (rFTP).',
      'La FC de los primeros 10 minutos aún se está estabilizando: por eso cuenta la de los últimos 20.',
    ],
  },
};

// ── Test VAM ──

/** VAM en km/h a partir de los metros recorridos en 6 minutos (1400 m → 14 km/h) */
export const vamKmh = (distanceM: number): number => (distanceM / VAM_TEST_SEC) * 3.6;

/** Ritmo medio del test VAM, en segundos por km (1400 m → 257,1 s = 4:17 /km) */
export const vamPace = (distanceM: number): number => (VAM_TEST_SEC * 1000) / distanceM;

export interface VamZone {
  name: string;
  /** Fracción de la VAM: 0.65 = 65 % */
  pct: number;
  /** Ritmo de la zona en segundos por km, redondeado al segundo */
  paceSec: number;
  /** Velocidad de la zona en km/h */
  kmh: number;
}

const VAM_PCTS = [0.65, 0.7, 0.85, 0.9, 0.95] as const;

/** Zonas 1 a 5: el ritmo que corresponde al 65, 70, 85, 90 y 95 % de la VAM */
export const vamZones = (distanceM: number): VamZone[] =>
  VAM_PCTS.map((pct, i) => ({
    name: `Zona ${i + 1}`,
    pct,
    paceSec: Math.round(vamPace(distanceM) / pct),
    kmh: vamKmh(distanceM) * pct,
  }));

// ── Test de Jim Vance (30') ──

const VANCE_ZONES = [
  ['Z1', 'Recuperación'],
  ['Z2', 'Aeróbica'],
  ['Z3', 'Tempo'],
  ['Z4', 'Umbral / MLSS'],
  ['Z5a', 'Supraumbral'],
  ['Z5b', 'Capacidad aeróbica (VO₂máx)'],
  ['Z5c', 'Capacidad anaeróbica / neuromuscular'],
] as const;

/** Límites entre zonas como múltiplos del ritmo de umbral (de la zona más lenta a la más rápida) */
const PACE_LIMITS = [1.29, 1.14, 1.05, 1, 0.96, 0.9] as const;
/** Límites entre zonas como múltiplos de la FC de umbral */
const HR_LIMITS = [0.81, 0.89, 0.95, 0.99, 1.02, 1.06] as const;

export interface RangeZone {
  name: string;
  label: string;
  /** Límite bajo de la zona (más lento / menos pulsaciones); null en la primera */
  from: number | null;
  /** Límite alto (más rápido / más pulsaciones); null en la última */
  to: number | null;
}

/** Siete zonas a partir de los seis límites (redondeados) entre ellas */
function rangeZones(limits: readonly number[]): RangeZone[] {
  return VANCE_ZONES.map(([name, label], i) => ({
    name,
    label,
    from: i === 0 ? null : limits[i - 1],
    to: i === limits.length ? null : limits[i],
  }));
}

/** Zonas de ritmo (s/km) a partir del ritmo medio de los 30' */
export const vancePaceZones = (paceSec: number): RangeZone[] =>
  rangeZones(PACE_LIMITS.map((k) => Math.round(k * paceSec)));

/** Zonas de FC (lpm) a partir de la FC media de los últimos 20' */
export const vanceHrZones = (lthr: number): RangeZone[] =>
  rangeZones(HR_LIMITS.map((k) => Math.round(k * lthr)));

export interface ZoneBand {
  /** Inicio y anchura de la zona en la escala común, en % */
  left: number;
  width: number;
  /** La zona no tiene límite por ese lado (la primera y la última) */
  open: 'start' | 'end' | null;
}

export interface ZoneScale {
  bands: ZoneBand[];
  /** Posición del valor de umbral (ritmo FTPa o LTHR) en la escala, en % */
  marker: number;
}

/**
 * Coloca las zonas de Jim Vance en una escala común de intensidad (0-100 %, de más suave a más
 * intensa), sea de ritmo (los números bajan con la intensidad) o de FC (suben). Las dos zonas
 * abiertas ocupan lo que mide de media una zona cerrada, para que se vean sin inventar un límite.
 */
export function zoneScale(zones: readonly RangeZone[], threshold: number): ZoneScale {
  const limits = zones.slice(1).map((z) => z.from!);
  const first = limits[0];
  const last = limits[limits.length - 1];
  const pad = (last - first) / Math.max(1, limits.length - 1);
  const lo = first - pad;
  const hi = last + pad;
  const pos = (v: number) => ((v - lo) / (hi - lo || 1)) * 100;
  const edges = [0, ...limits.map(pos), 100];
  return {
    bands: zones.map((_, i) => ({
      left: edges[i],
      width: edges[i + 1] - edges[i],
      open: i === 0 ? 'start' : i === zones.length - 1 ? 'end' : null,
    })),
    marker: Math.min(100, Math.max(0, pos(threshold))),
  };
}

/** «> 7:28 /km», «6:36 – 7:28 /km», «< 5:12 /km» */
export function paceRangeLabel(z: RangeZone): string {
  if (z.from === null) return `> ${fmtPace(z.to!)}`;
  if (z.to === null) return `< ${fmtPace(z.from)}`;
  return `${fmtMinSec(z.to)} – ${fmtPace(z.from)}`;
}

/** «< 147 lpm», «147 – 161 lpm», «> 192 lpm» */
export function hrRangeLabel(z: RangeZone): string {
  if (z.from === null) return `< ${z.to} lpm`;
  if (z.to === null) return `> ${z.from} lpm`;
  return `${z.from} – ${z.to} lpm`;
}

// ── Historial ──

/** Tests de un tipo, del más reciente al más antiguo */
export const runTestsOf = (list: readonly RunTest[], kind: RunTestKind): RunTest[] =>
  list.filter((t) => t.kind === kind).sort((a, b) => b.date.localeCompare(a.date));

/** Resultado principal de un test: «1400 m» (VAM) o «5:47 /km» (Jim Vance) */
export const runTestValue = (t: Pick<RunTest, 'kind' | 'distanceM' | 'paceSec'>): string =>
  t.kind === 'vam' ? `${t.distanceM ?? 0} m` : fmtPace(t.paceSec ?? 0);

/** Lo que acompaña al resultado: «14,0 km/h · 4:17 /km» o «181 lpm · 250 W» */
export function runTestDetail(t: RunTest): string {
  if (t.kind === 'vam') {
    const d = t.distanceM ?? 0;
    return d > 0 ? `${fmtKmh(vamKmh(d))} · ${fmtPace(vamPace(d))}` : '';
  }
  return [t.lthr != null ? `${t.lthr} lpm` : '', t.powerW != null ? `${t.powerW} W` : '']
    .filter(Boolean)
    .join(' · ');
}

export interface RunTestProgress {
  text: string;
  /** El último test es mejor que el anterior */
  better: boolean;
}

/** Cambio respecto al test anterior: más metros en el VAM o un ritmo más rápido en el de Jim Vance */
export function runTestProgress(latest: RunTest, previous: RunTest | undefined): RunTestProgress {
  if (!previous) return { text: 'Primer test', better: false };
  if (latest.kind === 'vam') {
    const diff = (latest.distanceM ?? 0) - (previous.distanceM ?? 0);
    if (!diff) return { text: 'Igual que el anterior', better: false };
    return { text: `${diff > 0 ? '+' : '−'}${Math.abs(diff)} m vs. el anterior`, better: diff > 0 };
  }
  const diff = Math.round((latest.paceSec ?? 0) - (previous.paceSec ?? 0));
  if (!diff) return { text: 'Igual que el anterior', better: false };
  return { text: `${fmtDelta(diff)} /km vs. el anterior`, better: diff < 0 };
}

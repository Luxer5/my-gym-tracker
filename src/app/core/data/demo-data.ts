import { Exercise, HyroxRace, HyroxTest, LiftRecord, RunTest } from '../models';

export interface DemoData {
  exercises: Exercise[];
  /** Registros por id de ejercicio */
  records: Record<string, LiftRecord[]>;
  hyrox: HyroxTest[];
  runTests: RunTest[];
  races: HyroxRace[];
}

/** Dos carreras ficticias de la misma división: la segunda, más rápida en casi todo */
const DEMO_RACES: HyroxRace[] = [
  {
    id: 'c1',
    event: 'HYROX Valencia',
    date: '2025-11-15',
    division: 'HYROX Men',
    ageGroup: '30-34',
    athlete: 'Atleta Demo',
    runs: [272, 298, 305, 310, 302, 315, 331, 322],
    stations: [272, 205, 268, 395, 281, 128, 332, 452],
    roxzoneSec: 452,
    totalSec: 5240,
    rankOverall: 812,
    rankAgeGroup: 143,
    note: 'Primera carrera',
    createdAt: '2025-11-16T10:00:00.000Z',
  },
  {
    id: 'c2',
    event: 'HYROX Madrid',
    date: '2026-04-18',
    division: 'HYROX Men',
    ageGroup: '30-34',
    athlete: 'Atleta Demo',
    runs: [262, 285, 290, 296, 288, 299, 312, 301],
    stations: [262, 186, 241, 361, 270, 118, 305, 401],
    roxzoneSec: 398,
    totalSec: 4875,
    rankOverall: 604,
    rankAgeGroup: 101,
    note: '',
    createdAt: '2026-04-19T10:00:00.000Z',
  },
];

/**
 * Datos ficticios de la demo y de los tests (unitarios y E2E dependen de ellos: si cambian,
 * revisa los specs). Fechas de 2026, antes del «hoy» fijo de los tests (7 oct 2026).
 */
export const demoData = (): DemoData => ({
  exercises: [
    {
      id: 'e1',
      name: 'Sentadilla',
      category: 'Piernas',
      unit: 'kg',
      createdAt: '2026-01-10T09:00:00.000Z',
    },
    {
      id: 'e2',
      name: 'Press banca',
      category: 'Empuje',
      unit: 'kg',
      createdAt: '2026-01-10T09:05:00.000Z',
    },
    {
      id: 'e3',
      name: 'Dominadas lastradas',
      category: 'Jalón',
      unit: 'kg',
      createdAt: '2026-02-01T18:00:00.000Z',
    },
  ],
  records: {
    e1: [
      { id: 'r1', type: 'PR', value: 140, date: '2026-09-20', note: 'sin faja' },
      { id: 'r2', type: '5RM', value: 115, date: '2026-09-02', note: '' },
      { id: 'r3', type: 'PR', value: 130, date: '2026-06-15', note: '' },
    ],
    e2: [
      { id: 'r4', type: '3RM', value: 85, date: '2026-08-28', note: 'pausa en el pecho' },
      { id: 'r5', type: '1RM', value: 95, date: '2026-07-10', note: '' },
    ],
    e3: [],
  },
  hyrox: [
    { id: 'h1', station: 'SkiErg', param: 1000, totalSec: 228, date: '2026-09-25', note: '' },
    {
      id: 'h2',
      station: 'SkiErg',
      param: 1000,
      totalSec: 241,
      date: '2026-08-14',
      note: 'cansado',
    },
    {
      id: 'h3',
      station: "Farmer's Carry",
      param: 24,
      totalSec: 95,
      date: '2026-09-18',
      note: '',
    },
    { id: 'h4', station: 'Wall Balls', param: 6, totalSec: 312, date: '2026-09-10', note: '' },
  ],
  runTests: [
    {
      id: 't1',
      kind: 'vam',
      distanceM: 1380,
      paceSec: null,
      lthr: null,
      powerW: null,
      date: '2026-09-15',
      note: 'pista',
    },
    {
      id: 't2',
      kind: 'vam',
      distanceM: 1320,
      paceSec: null,
      lthr: null,
      powerW: null,
      date: '2026-06-20',
      note: '',
    },
    {
      id: 't3',
      kind: 'vance30',
      distanceM: null,
      paceSec: 352,
      lthr: 176,
      powerW: null,
      date: '2026-08-28',
      note: '',
    },
  ],
  races: structuredClone(DEMO_RACES),
});

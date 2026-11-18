import {
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

// Proyecto «demo-»: el emulador nunca se conecta al proyecto real
const PROJECT_ID = 'demo-gym-log';
const ALICE = 'alice';
const BOB = 'bob';

/** Documentos de ejemplo de cada ruta que escribe la app */
const DOCS: Record<string, Record<string, unknown>> = {
  'exercises/e1': {
    name: 'Sentadilla',
    category: 'Piernas',
    unit: 'kg',
    createdAt: '2026-10-07T10:00:00.000Z',
  },
  'exercises/e1/records/r1': { type: 'PR', value: 140, date: '2026-10-07', note: '' },
  'hyrox/h1': { station: 'SkiErg', param: 1000, totalSec: 228, date: '2026-10-07', note: '' },
  'races/c1': {
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
};

let env: RulesTestEnvironment;

const pathOf = (uid: string, rest: string) => `users/${uid}/${rest}`;
const as = (uid: string) => env.authenticatedContext(uid).firestore();
const anonymous = () => env.unauthenticatedContext().firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(() => env?.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  // Datos de Bob creados sin pasar por las reglas
  await env.withSecurityRulesDisabled(async (ctx) => {
    for (const [rest, data] of Object.entries(DOCS))
      await setDoc(doc(ctx.firestore(), pathOf(BOB, rest)), data);
  });
});

describe('Reglas de Firestore', () => {
  describe('el propio usuario', () => {
    for (const [rest, data] of Object.entries(DOCS)) {
      it(`escribe, lee y borra ${rest}`, async () => {
        const ref = doc(as(ALICE), pathOf(ALICE, rest));
        await assertSucceeds(setDoc(ref, data));
        await assertSucceeds(getDoc(ref));
        await assertSucceeds(deleteDoc(ref));
      });
    }

    it('lee y borra sus datos', async () => {
      for (const rest of Object.keys(DOCS)) {
        await assertSucceeds(getDoc(doc(as(BOB), pathOf(BOB, rest))));
        await assertSucceeds(deleteDoc(doc(as(BOB), pathOf(BOB, rest))));
      }
    });
  });

  describe('otro usuario', () => {
    it('no puede leer, escribir ni borrar datos ajenos', async () => {
      for (const [rest, data] of Object.entries(DOCS)) {
        const ref = doc(as(ALICE), pathOf(BOB, rest));
        await assertFails(getDoc(ref));
        await assertFails(setDoc(ref, data));
        await assertFails(deleteDoc(ref));
      }
    });
  });

  describe('sin sesión', () => {
    it('no puede hacer nada', async () => {
      for (const [rest, data] of Object.entries(DOCS)) {
        const ref = doc(anonymous(), pathOf(BOB, rest));
        await assertFails(getDoc(ref));
        await assertFails(setDoc(ref, data));
      }
    });
  });

  describe('colecciones', () => {
    it('no se escribe fuera de las colecciones de la app', async () => {
      await assertFails(setDoc(doc(as(ALICE), pathOf(ALICE, 'otra/x1')), { name: 'x' }));
      await assertFails(setDoc(doc(as(ALICE), pathOf(ALICE, 'hyrox/h1/sub/x')), { name: 'x' }));
      await assertFails(setDoc(doc(as(ALICE), `users/${ALICE}`), { name: 'x' }));
    });
  });

  describe('límites', () => {
    const ex = (patch: Record<string, unknown>) =>
      setDoc(doc(as(ALICE), pathOf(ALICE, 'exercises/e2')), { ...DOCS['exercises/e1'], ...patch });
    const rec = (patch: Record<string, unknown>) =>
      setDoc(doc(as(ALICE), pathOf(ALICE, 'exercises/e1/records/r2')), {
        ...DOCS['exercises/e1/records/r1'],
        ...patch,
      });
    const hx = (patch: Record<string, unknown>) =>
      setDoc(doc(as(ALICE), pathOf(ALICE, 'hyrox/h2')), { ...DOCS['hyrox/h1'], ...patch });

    it('nombre: 100 caracteres sí, 101 no', async () => {
      await assertSucceeds(ex({ name: 'x'.repeat(100) }));
      await assertFails(ex({ name: 'x'.repeat(101) }));
    });

    it('nota: 500 caracteres sí, 501 no', async () => {
      await assertSucceeds(rec({ note: 'x'.repeat(500) }));
      await assertFails(rec({ note: 'x'.repeat(501) }));
    });

    it('los números tienen que ser números (param puede ser null)', async () => {
      await assertFails(rec({ value: '140' }));
      await assertFails(hx({ totalSec: '228' }));
      await assertSucceeds(hx({ param: null }));
    });

    it('carreras: 8 tramos sí, 9 no; textos y números con sus límites', async () => {
      const race = (patch: Record<string, unknown>) =>
        setDoc(doc(as(ALICE), pathOf(ALICE, 'races/c2')), { ...DOCS['races/c1'], ...patch });
      await assertSucceeds(race({ event: 'x'.repeat(100), roxzoneSec: null }));
      await assertFails(race({ runs: Array(9).fill(250) }));
      await assertFails(race({ stations: 'muchas' }));
      await assertFails(race({ event: 'x'.repeat(101) }));
      await assertFails(race({ division: 'x'.repeat(51) }));
      await assertFails(race({ rankOverall: '604' }));
    });

    it('demasiados campos', async () => {
      const extra = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`f${i}`, i]));
      await assertFails(hx(extra));
    });
  });
});

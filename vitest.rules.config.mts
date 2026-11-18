import { defineConfig } from 'vitest/config';

/**
 * Tests de las reglas de Firestore contra el emulador (`npm run test:rules`).
 * Van aparte de `ng test`: se ejecutan en Node y necesitan el emulador arrancado.
 */
export default defineConfig({
  test: {
    include: ['test/rules/**/*.spec.ts'],
    environment: 'node',
    testTimeout: 15000,
    hookTimeout: 30000,
  },
});

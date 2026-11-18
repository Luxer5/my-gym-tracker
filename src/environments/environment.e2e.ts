import { AppEnvironment } from './environment.model';
import { FIREBASE_CONFIG } from './firebase.config';

// Tests E2E y demo local (`npm run start:demo`): datos de ejemplo en memoria y login simulado
export const environment: AppEnvironment = {
  backend: 'memory',
  firebase: FIREBASE_CONFIG,
};

import { AppEnvironment } from './environment.model';
import { FIREBASE_CONFIG } from './firebase.config';

// Producción: Firebase real
export const environment: AppEnvironment = {
  backend: 'firebase',
  firebase: FIREBASE_CONFIG,
};

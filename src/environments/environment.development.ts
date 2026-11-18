import { AppEnvironment } from './environment.model';
import { FIREBASE_CONFIG } from './firebase.config';

// `ng serve`: Firebase real (los datos son los de tu cuenta)
export const environment: AppEnvironment = {
  backend: 'firebase',
  firebase: FIREBASE_CONFIG,
};

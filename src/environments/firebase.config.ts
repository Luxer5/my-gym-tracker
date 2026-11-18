import { FirebaseOptions } from './environment.model';

/**
 * Configuración del cliente de Firebase, común a todos los entornos (es pública: la protección de
 * los datos está en firestore.rules). Va aparte porque `environment.ts` se sustituye en cada
 * configuración de build (fileReplacements): si los otros entornos lo importaran, se importarían a
 * sí mismos.
 */
export const FIREBASE_CONFIG: FirebaseOptions = {
  apiKey: 'AIzaSyAPpI8pRCQeaKa8M4lfTwsknxk9iPHsjQ8',
  authDomain: 'gym-tracker-5d1c0.firebaseapp.com',
  projectId: 'gym-tracker-5d1c0',
  storageBucket: 'gym-tracker-5d1c0.firebasestorage.app',
  messagingSenderId: '728320121583',
  appId: '1:728320121583:web:d7888d1a195825f52d191a',
};

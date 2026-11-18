export interface FirebaseOptions {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface AppEnvironment {
  /** 'firebase' = datos reales; 'memory' = datos de demostración en memoria (E2E y demo sin conexión) */
  backend: 'firebase' | 'memory';
  firebase: FirebaseOptions;
}

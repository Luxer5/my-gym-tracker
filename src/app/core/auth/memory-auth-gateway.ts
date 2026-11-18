import { Injectable, signal } from '@angular/core';
import { AppUser } from '../models';
import { AuthGateway } from './auth-gateway';

export const DEMO_USER: AppUser = {
  uid: 'demo',
  displayName: 'Atleta Demo',
  email: 'demo@example.com',
  photoURL: null,
};

/** Clave de sessionStorage: '1' = sesión iniciada (sobrevive a recargas) */
export const DEMO_SESSION_KEY = 'demoSession';

/** Sesión simulada para demo, tests unitarios y E2E */
@Injectable()
export class MemoryAuthGateway extends AuthGateway {
  private readonly _user = signal<AppUser | null | undefined>(undefined);
  readonly user = this._user.asReadonly();

  constructor() {
    super();
    // Asíncrono, como Firebase: al arrancar todavía no se conoce la sesión
    queueMicrotask(() => this._user.set(read(DEMO_SESSION_KEY) === '1' ? DEMO_USER : null));
  }

  async signIn(): Promise<void> {
    write(DEMO_SESSION_KEY, '1');
    this._user.set(DEMO_USER);
  }

  async signOut(): Promise<void> {
    write(DEMO_SESSION_KEY, '0');
    this._user.set(null);
  }
}

function read(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* sin almacenamiento: solo en memoria */
  }
}

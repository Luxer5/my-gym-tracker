import { Signal } from '@angular/core';
import { AppUser } from '../models';

/**
 * Sesión del usuario. `user()` es undefined mientras no se conoce el estado,
 * null sin sesión y el usuario cuando hay sesión.
 * Implementaciones: Firebase (producción) y memoria (demo, tests y E2E).
 */
export abstract class AuthGateway {
  abstract readonly user: Signal<AppUser | null | undefined>;
  abstract signIn(): Promise<void>;
  abstract signOut(): Promise<void>;

  /** uid del usuario con sesión (lanza si no hay sesión) */
  uid(): string {
    const u = this.user();
    if (!u) throw new Error('No hay sesión iniciada');
    return u.uid;
  }
}

import { Injectable, inject, signal } from '@angular/core';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { FIREBASE_AUTH } from '../firebase';
import { AppUser } from '../models';
import { AuthGateway } from './auth-gateway';

/** Sesión con Google (Firebase Auth) */
@Injectable()
export class FirebaseAuthGateway extends AuthGateway {
  private readonly auth = inject(FIREBASE_AUTH);
  private readonly _user = signal<AppUser | null | undefined>(undefined);
  readonly user = this._user.asReadonly();

  constructor() {
    super();
    onAuthStateChanged(this.auth, (u) =>
      this._user.set(
        u ? { uid: u.uid, displayName: u.displayName, email: u.email, photoURL: u.photoURL } : null,
      ),
    );
  }

  async signIn(): Promise<void> {
    await signInWithPopup(this.auth, new GoogleAuthProvider());
  }

  signOut(): Promise<void> {
    return signOut(this.auth);
  }
}

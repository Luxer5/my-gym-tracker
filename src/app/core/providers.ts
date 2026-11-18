import { EnvironmentProviders, Provider, makeEnvironmentProviders } from '@angular/core';
import { TitleStrategy } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthGateway } from './auth/auth-gateway';
import { FirebaseAuthGateway } from './auth/firebase-auth-gateway';
import { FirestoreTrainingRepository } from './data/firestore-training-repository';
import { TrainingRepository } from './data/training-repository';
import { MEMORY_BACKEND } from './memory-backend';
import { PageTitleStrategy } from './services/page-title.strategy';

/** Backend de datos y sesión según el entorno (Firebase real o memoria) */
export function provideBackend(backend = environment.backend): Provider[] {
  return backend === 'memory'
    ? MEMORY_BACKEND
    : [
        { provide: AuthGateway, useClass: FirebaseAuthGateway },
        { provide: TrainingRepository, useClass: FirestoreTrainingRepository },
      ];
}

/** Servicios transversales: backend y títulos de página */
export function provideCore(): EnvironmentProviders {
  return makeEnvironmentProviders([
    ...provideBackend(),
    { provide: TitleStrategy, useExisting: PageTitleStrategy },
  ]);
}

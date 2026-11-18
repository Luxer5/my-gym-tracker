import { Provider } from '@angular/core';
import { AuthGateway } from './auth/auth-gateway';
import { MemoryAuthGateway } from './auth/memory-auth-gateway';
import { MemoryTrainingRepository } from './data/memory-training-repository';
import { TrainingRepository } from './data/training-repository';

/**
 * Backend en memoria con datos de demostración (demo, E2E y tests). En la compilación de producción
 * este fichero se sustituye por memory-backend.prod.ts (vacío): así la demo no viaja en la web real.
 */
export const MEMORY_BACKEND: Provider[] = [
  { provide: AuthGateway, useClass: MemoryAuthGateway },
  { provide: TrainingRepository, useClass: MemoryTrainingRepository },
];

import { Routes } from '@angular/router';

/** Pantallas (carga diferida); las pestañas salen de features/sections.ts */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'gym' },
  {
    path: 'gym',
    title: 'Gym',
    loadComponent: () => import('./features/gym/gym.component').then((m) => m.GymComponent),
  },
  {
    path: 'hyrox',
    title: 'Hyrox',
    loadComponent: () => import('./features/hyrox/hyrox.component').then((m) => m.HyroxComponent),
  },
  {
    path: 'carreras',
    title: 'Carreras',
    loadComponent: () =>
      import('./features/carreras/carreras.component').then((m) => m.CarrerasComponent),
  },
  {
    path: 'carreras/importar',
    title: 'Importar carrera',
    loadComponent: () =>
      import('./features/carreras/race-import.component').then((m) => m.RaceImportComponent),
  },
  {
    path: 'carreras/:id',
    title: 'Carrera',
    loadComponent: () =>
      import('./features/carreras/race-detail.component').then((m) => m.RaceDetailComponent),
  },
  { path: '**', redirectTo: 'gym' },
];

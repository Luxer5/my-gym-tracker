import { IconName } from '../shared/icon.component';

export interface Section {
  /** Ruta de la pantalla */
  key: string;
  label: string;
  /** Complemento del nombre que se oculta en pantallas estrechas */
  detail?: string;
  icon: IconName;
}

/** Pantallas de la aplicación, en el orden de las pestañas */
export const SECTIONS: readonly Section[] = [
  { key: 'gym', label: 'Gym', detail: 'PRs & RMs', icon: 'dumbbell' },
  { key: 'hyrox', label: 'Hyrox', icon: 'flame' },
  { key: 'carreras', label: 'Carreras', icon: 'flag' },
];

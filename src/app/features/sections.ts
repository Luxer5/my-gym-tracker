export interface Section {
  /** Ruta de la pantalla */
  key: string;
  label: string;
  /** Complemento del nombre que se oculta en pantallas estrechas */
  detail?: string;
  icon: string;
}

/** Pantallas de la aplicación, en el orden de las pestañas */
export const SECTIONS: readonly Section[] = [
  { key: 'gym', label: 'Gym', detail: 'PRs & RMs', icon: '🏋️' },
  { key: 'hyrox', label: 'Hyrox', icon: '🔥' },
  { key: 'carreras', label: 'Carreras', icon: '🏁' },
];

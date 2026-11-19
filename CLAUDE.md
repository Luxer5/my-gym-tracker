# GYM LOG (my-gym-tracker)

Registro privado de PRs/RMs de gimnasio y tests de Hyrox: Angular 22 + Firebase (Auth con Google,
Firestore) publicado en Netlify. La arquitectura copia la de InversionDashboard; el
[README](README.md) la describe con el modelo de datos, los comandos y el despliegue.

## Idioma y estilo

- Todo lo visible (textos de la UI, comentarios, commits, documentación) va en **español**. Los
  identificadores de código, en inglés salvo los nombres de pantallas.
- Mensajes de commit: una línea descriptiva en español, sin prefijos tipo `feat:`
  (p. ej. «Hyrox: aviso cuando los segundos pasan de 59»).
- Prettier (`printWidth` 100, comillas simples). La CI falla con `npm run format:check`; un hook
  formatea cada fichero que edita Claude.

## Arquitectura (resumen)

- `src/app/domain/`: lógica pura sin Angular, cada fichero con su `.spec.ts`. Cálculos (mejores
  marcas, agrupaciones Hyrox, resúmenes) y validación de formularios (`forms.ts`) van aquí, nunca
  en los componentes.
- `src/app/core/`: `models.ts` (tipos de Firestore), `auth/` y `data/` (interfaz abstracta →
  implementación Firestore | memoria para demo, tests y E2E), `state/training-store.ts` (signals),
  `services/` (avisos, confirmación, títulos).
- `src/app/features/<pantalla>/`: componentes standalone, `OnPush`, `inject()`, signals; las
  escrituras van en un servicio `*Actions`. Rutas con carga diferida en `app.routes.ts` y pestañas
  en `features/sections.ts`.
- `src/app/shared/`: piezas sin estado (modal, resumen, toasts, diálogo de confirmación, pipes).
- Estilos globales en `src/styles.css`; no hay CSS por componente. Diseño **«Podio»** (elegido entre tres propuestas): tokens semánticos en `:root` (`--bg`, `--surface`, `--accent` lima, `--text-2`…; los nombres antiguos son alias), Barlow + Barlow Condensed, píldoras para navegación, filtros y botones, un solo botón principal por pantalla, iconos SVG de `shared/icon.component.ts` (nunca emojis) y la capa de componentes en la sección «Capa Podio». Guía seguida: skill `ui-ux-pro-max`.

## Comandos

En PowerShell `npx`/`npm` pueden fallar por la política de ejecución: usa `npx.cmd` / `npm.cmd`.

```bash
npm start                                  # ng serve contra Firebase real
npm run start:demo                         # demo con datos en memoria y login simulado
npx ng test --watch=false                  # unitarios (Vitest)
npm run e2e                                # Playwright (demo en memoria, puerto 4300, escritorio y móvil)
npm run test:rules                         # reglas en el emulador (Java 21)
npm run capturas                           # capturas del README (docs/screenshots) con datos ficticios
npm run iconos                             # iconos PNG/ICO (iOS, Android, manifest) desde public/favicon.svg
npm run build
npm run format
```

## Reglas que no se deben olvidar

- **Compatibilidad de datos**: hay datos reales guardados por la versión anterior (un único
  `index.html`). Rutas y nombres de campos de Firestore no se cambian sin migración; los campos que
  falten se completan en `core/data/normalize.ts`.
- **Firestore**: si añades una colección o un campo, actualiza `firestore.rules` (rutas y `docOk`)
  **y** `test/rules/firestore.rules.spec.ts`. Netlify no despliega las reglas: se despliegan a mano
  con `/deploy-rules`.
- **CSP** (`netlify.toml`): un servicio externo nuevo necesita su dominio en la política o el
  navegador lo bloquea. Nada de scripts en línea (por eso `inlineCritical: false` en `angular.json`).
- **Datos de demo** (`core/data/demo-data.ts`) y el repositorio en memoria deben seguir el modelo:
  los tests unitarios, los E2E y las capturas dependen de ellos.
- **Capturas**: siempre con la demo y datos ficticios, nunca con una sesión real. Si cambia una
  pantalla, regenéralas con `npm run capturas` y revísalas antes de darlas por buenas.
- **Fechas**: ISO `YYYY-MM-DD` en hora local (`todayIso()` en `domain/format.ts`), nunca
  `toISOString()` para el día.
- **Resultados oficiales de HYROX**: la app **no** consulta ni extrae datos de results.hyrox.com
  (sin API; HYROX reclama sus resultados como base de datos protegida y envía requerimientos a quien
  los extrae) ni hay servidor que la descargue. El marcador «Importar en GYM LOG»
  (`domain/race-bookmarklet.ts`) lee la ficha en el navegador del usuario y abre
  `/carreras/importar#hyrox=<base64url>`; también se puede copiar y pegar. En ambos casos
  `domain/race-import.ts` lee el texto por etiquetas. Si
  cambia el formato de la web, se ajustan las etiquetas y se añade el texto nuevo a
  `src/testing/race-paste.ts` con su caso en `race-import.spec.ts`.
- **Gráficas**: configuración en `features/carreras/race-charts.ts` y
  `features/hyrox/run-test-charts.ts` (con spec), colores de `RACE_COLORS` y `ZONE_COLORS` (rampa
  ordinal de azules; Z5a/b/c comparten el de la zona 5), validados para el fondo oscuro `#151d2e`.
  Un color nuevo se valida antes con el script de la guía de visualización (`dataviz`; `--ordinal`
  para escalas como las zonas). Cifras en barras, notas en puntos y guía bajo el puntero son plugins
  de `shared/chart-plugins.ts`: el texto va con las tintas del tema, nunca con el color de la serie.
- **Movimiento**: tokens `--dur-1…4`, `--ease-out` y `--ease-spring` en `styles.css`. Las
  animaciones decorativas van dentro de `@media (prefers-reduced-motion: no-preference)` y con
  relleno `backwards` (al acabar no queda ningún `transform`, que rompería las ventanas `fixed`).
  Las cifras que cuentan (`CountUpDirective`) y Chart.js pintan el valor final si se pide reducir
  movimiento o no hay `requestAnimationFrame` (jsdom), así que los tests leen el valor final.
- **Nada de `innerHTML`** ni `alert()`/`confirm()`: textos con interpolación de Angular, avisos con
  `NotifyService` y confirmaciones con `ConfirmService`.
- La web se publica sola en Netlify al hacer push a `main` (`netlify.toml`).

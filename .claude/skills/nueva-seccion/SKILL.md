---
name: nueva-seccion
description: Lista de comprobación para añadir una pantalla o un tipo de dato nuevo a GYM LOG (modelo, dominio, repositorios, store, reglas, ruta, pestaña, demo y tests). Úsala al crear una sección como Gym o Hyrox, o al añadir un campo a lo que se guarda.
argument-hint: <nombre de la pantalla o dato> [descripción]
---

# Añadir una pantalla o un dato nuevo

Toma como referencia la pantalla más parecida (Hyrox es la más sencilla; Gym si hay subcolecciones)
y copia su forma. Recorre la lista entera; al final di qué puntos se tocaron y cuáles no aplicaban.

## Datos

1. **Tipos** en `src/app/core/models.ts` (y el comentario de rutas de Firestore de arriba).
2. **Lectura tolerante** en `core/data/normalize.ts`: los documentos antiguos pueden no traer el
   campo nuevo. Caso en `normalize.spec.ts`.
3. **Lógica pura** en `src/app/domain/<tema>.ts` con su `<tema>.spec.ts` (agrupaciones, mejores
   marcas, resúmenes). Validación del formulario en `domain/forms.ts` (`formTo…` devuelve
   `{ ok, data }` o `{ ok: false, error }`). Nada de Angular aquí.
4. **Repositorio**: método en `training-repository.ts` y en **las dos** implementaciones,
   `firestore-training-repository.ts` y `memory-training-repository.ts` (mismo orden de resultados).
5. **Store** (`core/state/training-store.ts`): signal con los datos y su `…Loaded`; se vacía en
   `stop()`.
6. **Datos de demo** (`core/data/demo-data.ts`): ejemplos ficticios y realistas. Los tests
   unitarios y los E2E dependen de ellos: revisa los specs si cambian.
7. **Reglas**: colección en la lista de `firestore.rules` y límite en `docOk` para cada campo de
   texto o número nuevo (mismo máximo que el `maxlength` del formulario); casos en
   `test/rules/firestore.rules.spec.ts`. Recuerda al usuario que hay que lanzar `/deploy-rules`.

## Interfaz

8. Carpeta `src/app/features/<pantalla>/`: componentes standalone `OnPush` con `inject()` y
   signals, plantilla `.html` si pasa de ~30 líneas, y servicio `<x>-actions.service.ts` para las
   escrituras (confirmaciones con `ConfirmService`, avisos con `NotifyService`, nunca `alert()`).
9. **Ruta** con `loadComponent` y `title` en `app.routes.ts`, y **pestaña** en `features/sections.ts`.
10. **Estilos** en `src/styles.css` (no hay CSS por componente), reutilizando las clases existentes;
    comprueba móvil (320–600 px). Formularios con `novalidate`: la validación es la del dominio.
11. Accesibilidad: `label for` en cada campo, `aria-label` en los botones de solo icono (✕),
    `aria-expanded` en los desplegables.

## Tests y docs

12. Spec del servicio `*Actions` y del componente (con `src/testing/feature-harness.ts`) y
    `e2e/<pantalla>.spec.ts` (corre en escritorio y en móvil).
13. Capturas: añade la pantalla nueva a `docs/capturas/capturas.spec.ts` (con datos ficticios),
    ejecuta `npm.cmd run capturas` y revisa las imágenes.
14. README: «Qué hace», «Pantallas» (con la captura), árbol de arquitectura y modelo de datos.
15. Verificación final: `npx.cmd ng test --watch=false`, `npm.cmd run format:check`,
    `npm.cmd run build`, `npm.cmd run e2e` y, si cambiaron las reglas, `npm.cmd run test:rules`.

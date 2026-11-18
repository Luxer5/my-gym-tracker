---
name: deploy-rules
description: Prueba las reglas de Firestore en el emulador y, si pasan, despliega las reglas y los índices en el proyecto real de Firebase (gym-tracker-5d1c0).
disable-model-invocation: true
---

# Desplegar las reglas de Firestore

Netlify solo publica la web: `firestore.rules` y `firestore.indexes.json` se despliegan a
mano. Sigue estos pasos en orden y para en cuanto uno falle.

1. **Cambios pendientes**: `git status --short firestore.rules firestore.indexes.json test/rules`.
   Si las reglas tienen cambios sin commit, avisa al usuario (se puede desplegar igual, pero que lo
   sepa).
2. **Contexto**: `git log -3 --oneline -- firestore.rules firestore.indexes.json` para ver qué se va
   a publicar.
3. **Tests en el emulador**: `npm.cmd run test:rules` (necesita Java 21; usa el proyecto
   `demo-gym-log`, nunca toca el real). Si falla algún test, **no despliegues**: enseña el fallo y
   termina.
4. **Sesión de Firebase**: `npx.cmd firebase login:list`. Si no hay sesión, pide al usuario que
   ejecute `! npx.cmd firebase login` y espera.
5. **Despliegue**: `npx.cmd firebase deploy --only firestore` (proyecto de `.firebaserc`). Si
   pregunta si borrar índices que existen en el proyecto y no están en el fichero, responde que no.
6. **Informe**: di si se publicó, el proyecto y la hora. Si el compilador de reglas da avisos,
   cópialos.

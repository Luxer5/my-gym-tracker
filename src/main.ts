import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig).catch((err) => {
  console.error(err);
  showBootError();
});

/** La app no ha podido arrancar: en lugar de quedarse en «Cargando…», se ofrece recargar */
function showBootError(): void {
  const root = document.querySelector('app-root');
  if (!root) return;
  const box = document.createElement('div');
  box.className = 'screen-center';
  box.setAttribute('role', 'alert');
  const msg = document.createElement('p');
  msg.className = 'loading-text';
  msg.textContent = 'No se pudo cargar la aplicación. Comprueba tu conexión y vuelve a intentarlo.';
  const btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.textContent = 'Recargar';
  btn.addEventListener('click', () => location.reload());
  box.append(msg, btn);
  root.replaceChildren(box);
}

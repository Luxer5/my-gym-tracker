/**
 * Marcador «Importar en GYM LOG»: se pulsa con la ficha oficial abierta en results.hyrox.com.
 * Es el propio navegador del usuario quien lee la página que ya está viendo (su texto, como al
 * copiarla entera) y abre GYM LOG con ese texto en la dirección, tras el `#`. Nada pasa por un
 * servidor: el fragmento no se envía en las peticiones. La app no descarga nada de la web oficial.
 */

/** Clave del fragmento: /carreras/importar#hyrox=<texto en base64url> */
export const IMPORT_FRAGMENT_KEY = 'hyrox';
/** Límite del texto que viaja en la dirección */
export const MAX_IMPORT_CHARS = 60_000;

const toBase64Url = (bin: string): string =>
  btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Texto → base64url (UTF-8), como hace el marcador */
export function encodeImportPayload(text: string): string {
  const bytes = new TextEncoder().encode(text.slice(0, MAX_IMPORT_CHARS));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return toBase64Url(bin);
}

/** Fragmento de la dirección («hyrox=…») → texto de la ficha; null si no viene del marcador */
export function decodeImportPayload(fragment: string | null | undefined): string | null {
  const m = new RegExp(`^${IMPORT_FRAGMENT_KEY}=([A-Za-z0-9_-]+)$`).exec(fragment ?? '');
  if (!m) return null;
  try {
    const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    return new TextDecoder('utf-8', { fatal: true }).decode(
      Uint8Array.from(bin, (c) => c.charCodeAt(0)),
    );
  } catch {
    return null;
  }
}

/**
 * Código del marcador (URL `javascript:`) para una instalación de GYM LOG en `appOrigin`.
 * Si se pulsa fuera de la web de resultados de HYROX, solo avisa.
 */
export function bookmarkletCode(appOrigin: string): string {
  const target = `${appOrigin}/carreras/importar#${IMPORT_FRAGMENT_KEY}=`;
  const script =
    '(function(){' +
    "if(!/hyrox/i.test(location.hostname)){alert('Abre primero tu resultado en results.hyrox.com y pulsa de nuevo el marcador.');return}" +
    "var t=(document.title+'\\n'+(document.body.innerText||document.body.textContent||''))" +
    `.slice(0,${MAX_IMPORT_CHARS});` +
    "var b=new TextEncoder().encode(t),s='';for(var i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);" +
    `var u=${JSON.stringify(target)}` +
    "+btoa(s).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');" +
    "if(!window.open(u,'_blank'))location.href=u" +
    '})()';
  // Codificado para que «#», «%» o espacios no se interpreten como parte de la dirección
  return `javascript:${encodeURIComponent(script)}`;
}

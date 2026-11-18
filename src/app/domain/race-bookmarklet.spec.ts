import { PASTE_DESKTOP } from '../../testing/race-paste';
import {
  MAX_IMPORT_CHARS,
  bookmarkletCode,
  decodeImportPayload,
  encodeImportPayload,
} from './race-bookmarklet';

/** Ejecuta el marcador en una «página» simulada; devuelve la URL que abre (o el aviso) */
function runBookmarklet(page: { host: string; title: string; text: string }, popup = true) {
  const code = bookmarkletCode('https://gymlog.example');
  expect(code.startsWith('javascript:')).toBe(true);
  const script = decodeURIComponent(code.slice('javascript:'.length));
  const opened: string[] = [];
  const alerts: string[] = [];
  const location = { hostname: page.host, href: '' };
  const fakeWindow = {
    open: (url: string) => {
      opened.push(url);
      return popup ? {} : null;
    },
  };
  const fakeDocument = { title: page.title, body: { innerText: page.text } };
  new Function('location', 'document', 'window', 'alert', script)(
    location,
    fakeDocument,
    fakeWindow,
    (m: string) => alerts.push(m),
  );
  return { opened, alerts, location };
}

describe('race bookmarklet', () => {
  it('payload round trip keeps accents, tabs and line breaks', () => {
    const text = 'Peña, José (ESP)\nRunning 1\t00:04:18\nWall Balls\t06:29 · ✓';
    const payload = encodeImportPayload(text);
    expect(payload).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeImportPayload(`hyrox=${payload}`)).toBe(text);
  });

  it('decode ignores anything that does not come from the bookmarklet', () => {
    expect(decodeImportPayload(null)).toBeNull();
    expect(decodeImportPayload('')).toBeNull();
    expect(decodeImportPayload('otro=abc')).toBeNull();
    expect(decodeImportPayload('hyrox=***')).toBeNull();
    // Bytes que no son UTF-8 válido
    expect(decodeImportPayload('hyrox=_w')).toBeNull();
  });

  it('encode limits the size of the text', () => {
    const long = 'x'.repeat(MAX_IMPORT_CHARS + 500);
    expect(decodeImportPayload(`hyrox=${encodeImportPayload(long)}`)).toHaveLength(
      MAX_IMPORT_CHARS,
    );
  });

  it('on the official page it opens GYM LOG with the page text', () => {
    const { opened, alerts } = runBookmarklet({
      host: 'results.hyrox.com',
      title: 'HYROX - For Every Body: Atleta Demo',
      text: PASTE_DESKTOP,
    });
    expect(alerts).toEqual([]);
    expect(opened).toHaveLength(1);
    const url = new URL(opened[0]);
    expect(url.origin + url.pathname).toBe('https://gymlog.example/carreras/importar');
    expect(decodeImportPayload(url.hash.slice(1))).toBe(
      `HYROX - For Every Body: Atleta Demo\n${PASTE_DESKTOP}`,
    );
  });

  it('if the popup is blocked it navigates in the same tab', () => {
    const { location } = runBookmarklet(
      { host: 'results.hyrox.com', title: 't', text: 'x' },
      false,
    );
    expect(location.href).toMatch(/^https:\/\/gymlog\.example\/carreras\/importar#hyrox=/);
  });

  it('anywhere else it only warns', () => {
    const { opened, alerts } = runBookmarklet({ host: 'example.com', title: 't', text: 'x' });
    expect(opened).toEqual([]);
    expect(alerts[0]).toContain('results.hyrox.com');
  });

  it('the code has no raw "#" or "%" that a browser could misread', () => {
    const body = bookmarkletCode('https://gymlog.example').slice('javascript:'.length);
    expect(body).not.toMatch(/#|\s/);
  });
});

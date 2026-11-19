// Genera los iconos PNG/ICO de la web a partir de public/favicon.svg (npm run iconos).
// Safari en iOS, la pantalla de inicio y el manifiesto no usan el SVG: sin estos PNG el navegador
// muestra la inicial del título («G») en lugar del logotipo.
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const PUBLIC = new URL('../../public/', import.meta.url);
const svg = readFileSync(new URL('favicon.svg', PUBLIC), 'utf8');

/** Fondo a sangre (sin esquinas redondeadas): iOS y Android aplican su propia máscara */
const fullBleed = svg.replace(' rx="14"', '');
/** Mancuerna reducida al 80 % para que quepa en la zona segura de los iconos «maskable» */
const maskable = fullBleed.replace('<g fill', '<g transform="translate(6.4 6.4) scale(0.8)" fill');

const browser = await chromium.launch();
const page = await browser.newPage();

async function render(source, size) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${source}`,
  );
  return page.screenshot({ omitBackground: true });
}

const outputs = [
  ['apple-touch-icon.png', fullBleed, 180],
  ['icon-192.png', svg, 192],
  ['icon-512.png', svg, 512],
  ['icon-maskable-512.png', maskable, 512],
];
for (const [name, source, size] of outputs) {
  writeFileSync(new URL(name, PUBLIC), await render(source, size));
}

// favicon.ico con PNG de 16, 32 y 48 px dentro (formato admitido por todos los navegadores actuales)
const sizes = [16, 32, 48];
const images = [];
for (const size of sizes) images.push(await render(svg, size));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((size, i) => {
  const entry = 6 + 16 * i;
  header.writeUInt8(size, entry);
  header.writeUInt8(size, entry + 1);
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(images[i].length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += images[i].length;
});
writeFileSync(new URL('favicon.ico', PUBLIC), Buffer.concat([header, ...images]));

await browser.close();
console.log('Iconos generados en public/');

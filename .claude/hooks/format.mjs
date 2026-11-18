// Hook PostToolUse: formatea con Prettier el fichero recién editado (la CI falla con
// `npm run format:check`). Usa el Prettier del proyecto y respeta .prettierrc y .prettierignore.
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const FORMATTABLE = /\.(ts|mts|js|mjs|html|css|json|md|ya?ml)$/i;

let input = '';
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', async () => {
  try {
    const data = JSON.parse(input);
    const file = String(data.tool_input?.file_path ?? '');
    const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    if (!file || !FORMATTABLE.test(file) || relative(root, file).startsWith('..')) return;

    const require = createRequire(join(root, 'package.json'));
    // require.resolve da la entrada CommonJS: sus funciones llegan en `default`
    const mod = await import(pathToFileURL(require.resolve('prettier')).href);
    const prettier = mod.default ?? mod;
    const info = await prettier.getFileInfo(file, {
      ignorePath: join(root, '.prettierignore'),
    });
    if (info.ignored || !info.inferredParser) return;

    const source = await readFile(file, 'utf8');
    const options = (await prettier.resolveConfig(file)) ?? {};
    const out = await prettier.format(source, { ...options, filepath: file });
    if (out !== source) await writeFile(file, out);
  } catch {
    // Sin Prettier instalado o fichero con errores de sintaxis: no se toca nada
  }
});

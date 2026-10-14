// Pulls the exact lucide path data the app renders, so icons match the editor.
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../editor/package.json'));
const root = path.dirname(require.resolve('lucide-react/package.json'));
const names = ['globe', 'eye-off', 'copy', 'check', 'arrow-up-right', 'lock', 'pencil-line', 'loader-circle', 'chevron-right', 'chevron-down', 'x', 'circle-check', 'link', 'lock-open', 'eye', 'arrow-right', 'lock-keyhole', 'circle-alert', 'triangle-alert', 'eye-off', 'key-round', 'ellipsis', 'ellipsis-vertical', 'link-2-off', 'settings-2', 'power', 'circle-off', 'clock', 'external-link', 'users', 'rotate-cw', 'user-round', 'circle-user-round', 'link-2', 'earth', 'chevron-up', 'chevron-left'];
const out = {};
for (const name of names) {
  const mod = await import(pathToFileURL(path.join(root, 'dist/esm/icons', `${name}.mjs`)).href);
  out[name] = mod.__iconNode
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).filter(([k]) => k !== 'key').map(([k, v]) => `${k}="${v}"`).join(' ')}/>`)
    .join('');
}
writeFileSync(path.join(here, 'icons.js'), `window.ICONS = ${JSON.stringify(out)};\n`);
console.log(Object.keys(out).length, 'icons written');

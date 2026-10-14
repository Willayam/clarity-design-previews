// Bundles the app's real Button variants with esbuild and writes the class
// strings the prototype uses, so no Tailwind class is retyped by hand.
import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const out = path.join(repo, 'editor/.context-button-bundle.mjs');
await build({
  entryPoints: [path.join(repo, 'editor/src/components/ui/button.tsx')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: out,
  alias: { '@': path.join(repo, 'editor/src') },
  external: ['react', '@base-ui/react/button', 'lucide-react'],
  logLevel: 'error',
});
const { buttonVariants } = await import(pathToFileURL(out).href);
const want = {
  primaryLg: { variant: 'default', size: 'lg' },
  primary: { variant: 'default', size: 'default' },
  primarySm: { variant: 'default', size: 'sm' },
  outlineLg: { variant: 'outline', size: 'lg' },
  outline: { variant: 'outline', size: 'default' },
  outlineSm: { variant: 'outline', size: 'sm' },
  ghostIcon: { variant: 'ghost', size: 'icon-toolbar' },
  ghost: { variant: 'ghost', size: 'default' },
  ghostSm: { variant: 'ghost', size: 'sm' },
  destructiveSm: { variant: 'destructive', size: 'sm' },
  destructiveLg: { variant: 'destructive', size: 'lg' },
  ghostLg: { variant: 'ghost', size: 'lg' },
  dangerLg: { variant: 'danger', size: 'lg' },
  outlineIcon: { variant: 'outline', size: 'icon' },
  ghostIconSm: { variant: 'ghost', size: 'icon-sm' },
  destructive: { variant: 'destructive', size: 'default' },
  dangerSm: { variant: 'danger', size: 'sm' },
  danger: { variant: 'danger', size: 'default' },
  linkInline: { variant: 'link', size: 'inline' },
  plainInline: { variant: 'plain', size: 'inline' },
};
const classes = Object.fromEntries(
  Object.entries(want).map(([k, v]) => [k, buttonVariants({ ...v, surface: 'panel', paint: 'face', shape: 'default' })]),
);
writeFileSync(path.join(here, 'button-classes.js'), `window.BTN = ${JSON.stringify(classes, null, 2)};\n`);
console.log(Object.keys(classes).length, 'button class sets written');

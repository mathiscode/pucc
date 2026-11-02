import { copyFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));

export function bundleConfig({ format, autoInit, production }) {
  return {
    entryPoints: [join(root, 'src/index.ts')],
    bundle: true,
    platform: 'browser',
    target: 'es2020',
    format,
    sourcemap: !production,
    minify: production,
    logLevel: 'info',
    loader: { '.css': 'css' },
    define: { __PUCC_AUTO_INIT__: JSON.stringify(String(autoInit)) },
    banner: { js: `/*! ${packageJson.name} v${packageJson.version} */` },
  };
}

export function copyFile(from, to) {
  copyFileSync(join(root, from), join(root, to));
  console.log(`Copied ${from} to ${to}`);
}

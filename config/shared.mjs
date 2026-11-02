import { copyFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));

export function bundleConfig({ production }) {
  return {
    bundle: true,
    platform: 'browser',
    target: 'es2020',
    sourcemap: !production,
    minify: production,
    logLevel: 'info',
    define: { __PUCC_VERSION__: JSON.stringify(packageJson.version) },
    banner: { js: `/*! ${packageJson.name} v${packageJson.version} */` },
  };
}

export function copyFile(from, to) {
  copyFileSync(join(root, from), join(root, to));
  console.log(`Copied ${from} to ${to}`);
}

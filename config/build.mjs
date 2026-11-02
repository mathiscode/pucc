import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, watch } from 'node:fs';
import { join } from 'node:path';
import * as esbuild from 'esbuild';
import { bundleConfig, copyFile, root } from './shared.mjs';

const isWatch = process.argv.includes('--watch');
const production = !isWatch;

const builds = [
  // Script-tag bundle: self-contained, auto-initializes window.Pucc
  {
    ...bundleConfig({ production }),
    entryPoints: [join(root, 'src/iife.ts')],
    format: 'iife',
    outfile: join(root, 'dist/pucc.js'),
  },
  // Library entry points: xterm stays a peer dependency of the consumer
  {
    ...bundleConfig({ production }),
    entryPoints: [join(root, 'src/index.ts'), join(root, 'src/terminal.ts')],
    format: 'esm',
    splitting: true,
    external: ['@xterm/*'],
    outdir: join(root, 'dist'),
    chunkNames: 'chunks/[name]-[hash]',
  },
];

function copyStatic() {
  copyFile('src/demo.css', 'dist/demo.css');
  copyFile('public/index.html', 'dist/index.html');
}

function generateTypes() {
  execFileSync(join(root, 'node_modules/.bin/tsc'), ['-p', 'tsconfig.build.json'], {
    cwd: root,
    stdio: 'inherit',
  });
}

rmSync(join(root, 'dist'), { recursive: true, force: true });
mkdirSync(join(root, 'dist'), { recursive: true });
copyStatic();

if (isWatch) {
  const contexts = await Promise.all(builds.map(options => esbuild.context(options)));
  await Promise.all(contexts.map(context => context.watch()));
  watch(join(root, 'src/demo.css'), copyStatic);
  watch(join(root, 'public/index.html'), copyStatic);
  generateTypes();
  console.log('Watching for changes...');
} else {
  await Promise.all(builds.map(options => esbuild.build(options)));
  generateTypes();
  console.log('Build completed successfully!');
}

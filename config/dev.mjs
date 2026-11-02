import { watch } from 'node:fs';
import { join } from 'node:path';
import * as esbuild from 'esbuild';
import { bundleConfig, copyFile, root } from './shared.mjs';

const port = Number(process.env.PORT) || 8000;

const context = await esbuild.context({
  ...bundleConfig({ format: 'iife', autoInit: true, production: false }),
  outfile: join(root, 'public/pucc.js'),
  write: false,
});

const copyDemoCSS = () => copyFile('src/demo.css', 'public/demo.css');
copyDemoCSS();
watch(join(root, 'src/demo.css'), copyDemoCSS);

await context.watch();
const { hosts, port: boundPort } = await context.serve({
  servedir: join(root, 'public'),
  port,
});
console.log(`Development server running at http://${hosts[0]}:${boundPort}`);

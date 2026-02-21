const { createServer } = require('esbuild-server');
const esbuild = require('esbuild');
const { copyFileSync, watch } = require('fs');
const { join } = require('path');

const server = createServer(
  {
    bundle: true,
    entryPoints: ['src/index.ts'],
    format: 'iife',
    outfile: 'public/pucc.js',
    platform: 'browser',
    target: 'es2020',
    sourcemap: true,
    logLevel: 'info',
    define: {
      '__PUCC_AUTO_INIT__': JSON.stringify('true'),
    },
    loader: {
      '.css': 'css',
    },
  },
  {
    static: 'public',
    open: true,
  }
);

function copyDemoCSS() {
  try {
    const srcPath = join(__dirname, 'src', 'demo.css');
    const destPath = join(__dirname, 'public', 'demo.css');
    copyFileSync(srcPath, destPath);
    console.log('Copied demo.css from src/ to public/');
  } catch (error) {
    console.error('Failed to copy demo CSS:', error);
  }
}

function watchDemoCSS() {
  const srcCssPath = join(__dirname, 'src', 'demo.css');
  copyDemoCSS();
  watch(srcCssPath, () => {
    copyDemoCSS();
  });
}

async function buildDemo() {
  try {
    const ctx = await esbuild.context({
      bundle: true,
      entryPoints: ['public/demo.ts'],
      format: 'iife',
      outfile: 'public/demo.js',
      platform: 'browser',
      target: 'es2020',
      sourcemap: true,
      logLevel: 'info',
      loader: {
        '.css': 'css',
      },
    });
    await ctx.watch();
    return ctx;
  } catch (error) {
    console.error('Failed to build demo:', error);
    throw error;
  }
}

const buildStart = Date.now();
watchDemoCSS();
Promise.all([
  server.start(),
  buildDemo(),
])
  .then(([, demoContext]) => {
    console.log(`Build completed in ${Date.now() - buildStart}ms`);
    console.log(`Development server running at ${server.url}`);
    console.log('Demo CSS is being watched for changes');
  })
  .catch((error) => {
    console.error('Build failed:', error);
    process.exit(1);
  });
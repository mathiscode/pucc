const esbuild = require('esbuild');
const { readFileSync, mkdirSync, copyFileSync } = require('fs');
const { join } = require('path');
const { execSync } = require('child_process');

const isWatch = process.argv.includes('--watch');
const isProduction = process.env.NODE_ENV === 'production';

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
);

// Ensure dist and public directories exist
const distDir = join(__dirname, '..', 'dist');
const publicDir = join(__dirname, '..', 'public');
try {
  mkdirSync(distDir, { recursive: true });
  mkdirSync(publicDir, { recursive: true });
} catch (error) {
  // Directory might already exist, ignore
}

const baseConfig = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'browser',
  target: 'es2020',
  sourcemap: !isProduction,
  minify: isProduction,
  logLevel: 'info',
  loader: {
    '.css': 'css',
  },
};

// IIFE build for script tag inclusion
const iifeBuild = {
  ...baseConfig,
  format: 'iife',
  outfile: 'dist/pucc.js',
  define: {
    '__PUCC_AUTO_INIT__': JSON.stringify('true'),
  },
  banner: {
    js: `/*! ${packageJson.name} v${packageJson.version} */`,
  },
};

// ESM build for module import
const esmBuild = {
  ...baseConfig,
  format: 'esm',
  outfile: 'dist/pucc.esm.js',
  define: {
    '__PUCC_AUTO_INIT__': JSON.stringify('false'),
  },
  banner: {
    js: `/*! ${packageJson.name} v${packageJson.version} */`,
  },
};

function buildDemoCSS() {
  try {
    const srcPath = join(__dirname, '..', 'src', 'demo.css');
    const publicDestPath = join(__dirname, '..', 'public', 'demo.css');
    const distDestPath = join(__dirname, '..', 'dist', 'demo.css');
    copyFileSync(srcPath, publicDestPath);
    copyFileSync(srcPath, distDestPath);
    console.log('Copied demo.css from src/ to public/ and dist/');
  } catch (error) {
    console.error('Failed to copy demo CSS:', error);
    throw error;
  }
}

function copyIndexHTML() {
  try {
    const srcPath = join(__dirname, '..', 'public', 'index.html');
    const destPath = join(__dirname, '..', 'dist', 'index.html');
    copyFileSync(srcPath, destPath);
    console.log('Copied index.html from public/ to dist/');
  } catch (error) {
    console.error('Failed to copy index.html:', error);
    throw error;
  }
}

async function build() {
  try {
    // Copy demo CSS first
    buildDemoCSS();
    // Copy index.html to dist
    copyIndexHTML();

    if (isWatch) {
      // Watch mode for development
      const iifeContext = await esbuild.context(iifeBuild);
      const esmContext = await esbuild.context(esmBuild);

      // Watch for CSS changes
      const { watch } = require('fs');
      const srcCssPath = join(__dirname, '..', 'src', 'demo.css');
      watch(srcCssPath, () => {
        buildDemoCSS();
      });

      // Watch for index.html changes
      const indexHtmlPath = join(__dirname, '..', 'public', 'index.html');
      watch(indexHtmlPath, () => {
        copyIndexHTML();
      });

      await Promise.all([
        iifeContext.watch(),
        esmContext.watch(),
      ]);

      // Generate types once, then watch for changes
      generateTypes();
      console.log('Watching for changes...');
    } else {
      // Production build
      await Promise.all([
        esbuild.build(iifeBuild),
        esbuild.build(esmBuild),
      ]);

      // Generate TypeScript declaration files
      generateTypes();

      console.log('Build completed successfully!');
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

function generateTypes() {
  try {
    execSync('npx tsc --emitDeclarationOnly --declaration --declarationMap', {
      cwd: join(__dirname, '..'),
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('Failed to generate type definitions:', error);
    process.exit(1);
  }
}

build();

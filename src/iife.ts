import { Pucc } from './core/Pucc';
import './terminal';

const shell = new Pucc();
shell.initialize();
window.Pucc = shell;

// esbuild's globalName assignment can overwrite window.Pucc after this script runs
Promise.resolve().then(() => {
  if (window.Pucc !== shell) {
    window.Pucc = shell;
  }
});

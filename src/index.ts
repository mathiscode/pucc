import { Pucc } from './core/Pucc';
import { ShellTerminal } from './components/ShellTerminal';
import { TerminalLogger } from './components/TerminalLogger';

// Build-time constant replaced by esbuild define
declare const __PUCC_AUTO_INIT__: string;

// Export the main class
export { Pucc };
export { ShellTerminal };
export { TerminalLogger };
export type { Command, CommandHandler, ParsedArgs } from './types';

// Create and initialize the shell instance
// For IIFE builds, this will be executed immediately when the script loads
// For ESM builds, users should create their own instances with desired options
// __PUCC_AUTO_INIT__ is replaced at build time by esbuild define
const shouldAutoInit = __PUCC_AUTO_INIT__ === 'true';
const shell = shouldAutoInit ? new Pucc() : null;

// Auto-initialize when loaded in browser (for IIFE builds only)
if (shouldAutoInit && typeof window !== 'undefined' && shell) {
  shell.initialize();
  
  // Set the instance on window for user access
  // We assign it directly - if esbuild's globalName overwrites it,
  // we'll fix it in the next microtask
  window.Pucc = shell;
  
  // Ensure our instance assignment takes precedence over esbuild's globalName
  // by setting it again after the current execution context
  Promise.resolve().then(() => {
    if (window.Pucc !== shell) {
      window.Pucc = shell;
    }
  });

  // Auto-register the custom element if customElements is available
  if (typeof customElements !== 'undefined' && !customElements.get('pucc-terminal')) {
    customElements.define('pucc-terminal', ShellTerminal);
  }
}

// For ESM builds, auto-register the custom element (but don't create global instance)
if (!shouldAutoInit && typeof window !== 'undefined' && typeof customElements !== 'undefined' && !customElements.get('pucc-terminal')) {
  customElements.define('pucc-terminal', ShellTerminal);
}

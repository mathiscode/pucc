import { ShellTerminal } from './components/ShellTerminal';

export { TerminalLogger } from './components/TerminalLogger';
export { ShellTerminal };

if (typeof customElements !== 'undefined' && !customElements.get('pucc-terminal')) {
  customElements.define('pucc-terminal', ShellTerminal);
}

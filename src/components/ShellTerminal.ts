import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import * as ansi from '../ansi';
import type { Pucc } from '../core/Pucc';
import { Pucc as PuccClass } from '../core/Pucc';
import type { Command, CommandHandler } from '../types';
import { LineEditor } from './LineEditor';
import {
  decodeEscapeSequences,
  getThemeColors,
  getXtermTheme,
  parseHeightValue,
  renderShellMarkup,
} from './shellStyles';
import { TerminalLogger } from './TerminalLogger';

interface HotkeyConfig {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
}

interface PuccOptions {
  customHelpHandler?: CommandHandler;
  initialCommands?: Command[];
  enableGlobalRegistrations?: boolean;
  commandPrefix?: string;
}

export class ShellTerminal extends HTMLElement {
  #terminal: Terminal | null = null;
  #fitAddon: FitAddon | null = null;
  #container: HTMLElement | null = null;
  #isVisible = false;
  #editor = new LineEditor();
  #running: { controller: AbortController; input: string } | null = null;
  #shell: Pucc | null = null;
  #hotkeyConfig: HotkeyConfig = { key: 's', altKey: true };
  #hotkeyAbort: AbortController | null = null;
  #timers = new Set<ReturnType<typeof setTimeout>>();
  #logger: TerminalLogger | null = null;
  #promptText = '$ ';
  #isEmbedded = false;
  #initialContent: string | null = null;
  #puccOptions: PuccOptions | null = null;

  static get observedAttributes() {
    return [
      'hotkey',
      'height',
      'theme',
      'prompt',
      'embedded',
      'initial-content',
      'pucc-options',
      'history-limit',
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.#isEmbedded = this.#readEmbedded();
    const puccOptionsAttr = this.getAttribute('pucc-options');
    if (puccOptionsAttr !== null) {
      this.#parsePuccOptions(puccOptionsAttr);
    }
    this.#applyHistoryLimit(this.getAttribute('history-limit'));
    this.#render();
    this.#initializeTerminal();
    if (!this.#isEmbedded) {
      this.#setupHotkeyListener();
    }
  }

  disconnectedCallback() {
    this.#cleanup();
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'embedded':
        this.#isEmbedded = this.#readEmbedded();
        this.#render();
        if (this.#isEmbedded) {
          this.#hotkeyAbort?.abort();
          this.#hotkeyAbort = null;
          if (this.#container) {
            this.#container.classList.add('visible');
            this.#isVisible = true;
          }
        } else {
          this.#setupHotkeyListener();
          if (this.#container && !this.#isVisible) {
            this.#container.classList.remove('visible');
          }
        }
        this.#fitSoon();
        break;
      case 'hotkey':
        this.#parseHotkey(newValue);
        if (!this.#isEmbedded) {
          this.#setupHotkeyListener();
        }
        break;
      case 'height':
        this.#updateHeight();
        break;
      case 'theme':
        this.#updateTheme();
        break;
      case 'prompt':
        this.#promptText = newValue || '$ ';
        this.#updatePrompt();
        break;
      case 'initial-content':
        this.#initialContent = newValue ? decodeEscapeSequences(newValue) : null;
        break;
      case 'history-limit':
        this.#applyHistoryLimit(newValue);
        break;
      case 'pucc-options':
        this.#parsePuccOptions(newValue);
        this.#initializeShell();
        break;
    }
  }

  #applyHistoryLimit(value: string | null) {
    const limit = Number.parseInt(value ?? '', 10);
    if (limit > 0) this.#editor.history.limit = limit;
  }

  #readEmbedded(): boolean {
    return this.hasAttribute('embedded') && this.getAttribute('embedded') !== 'false';
  }

  /** setTimeout(0) that is cancelled on disconnect */
  #defer(fn: () => void) {
    const id = setTimeout(() => {
      this.#timers.delete(id);
      fn();
    }, 0);
    this.#timers.add(id);
  }

  #fitSoon() {
    if (this.#fitAddon) this.#defer(() => this.#fitAddon?.fit());
  }

  #render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = renderShellMarkup({
      heightValue: parseHeightValue(this.getAttribute('height') || '400px'),
      isEmbedded: this.#isEmbedded,
      colors: getThemeColors(this.getAttribute('theme')),
    });

    this.#container = this.shadowRoot.querySelector('.terminal-wrapper') as HTMLElement;
    if (this.#isEmbedded) {
      this.#isVisible = true;
    }
  }

  #initializeTerminal() {
    if (!this.shadowRoot) return;

    const terminalElement = this.shadowRoot.querySelector('.terminal-element') as HTMLElement;
    if (!terminalElement) return;

    const promptAttr = this.getAttribute('prompt');
    if (promptAttr !== null) {
      this.#promptText = promptAttr;
    }

    const initialContentAttr = this.getAttribute('initial-content');
    if (initialContentAttr !== null) {
      this.#initialContent = decodeEscapeSequences(initialContentAttr);
    }

    const style = getComputedStyle(this);
    const fontFamily =
      style.getPropertyValue('--shell-font-family').trim() ||
      "'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace";

    const terminal = new Terminal({
      theme: getXtermTheme(this.getAttribute('theme'), style),
      fontFamily: fontFamily.replace(/['"]/g, ''),
      fontSize: 14,
      cursorBlink: true,
      cursorStyle: 'block',
      allowTransparency: true,
      allowProposedApi: true,
    });
    const fitAddon = new FitAddon();
    this.#terminal = terminal;
    this.#fitAddon = fitAddon;

    terminal.loadAddon(fitAddon);
    terminal.open(terminalElement);

    this.#logger = new TerminalLogger(terminal);

    terminal.onData(data => this.#handleInput(data));
    terminal.onKey(({ domEvent }) => {
      if (domEvent.key === 'Escape' && !this.#isEmbedded) {
        this.hide();
      }
    });

    terminal.clear();
    fitAddon.fit();

    this.#initializeShell();

    this.#defer(() => {
      terminal.clear();
      fitAddon.fit();

      if (this.#initialContent !== null) {
        for (const line of this.#initialContent.split('\n')) terminal.writeln(line);
      } else {
        terminal.writeln(ansi.bold(ansi.cyan('Pucc Terminal')));
        terminal.writeln(ansi.gray('Press Escape to close; type `help` for available commands'));

        if (!this.#shell) {
          terminal.writeln(ansi.yellow('\r\nWarning: Pucc not found on window'));
        }
      }

      this.#writePrompt();
    });

    if (this.#isEmbedded) {
      this.#defer(() => {
        terminal.focus();
        fitAddon.fit();
      });
    }
  }

  #handleInput(data: string) {
    const terminal = this.#terminal;
    if (!terminal) return;

    if (this.#running) {
      // Only Ctrl+C is accepted while a command runs
      if (data === '\x03') this.#cancelRunning();
      return;
    }

    const result = this.#editor.handle(data);
    if (result.output) terminal.write(result.output);

    if (result.submit !== undefined) {
      const pending = this.#executeCommand(result.submit);
      terminal.write('\r\n');
      if (!pending) this.#writePrompt();
    } else if (result.cancelled) {
      this.#writePrompt();
    }
  }

  /** Returns true when the command is still running asynchronously */
  #executeCommand(input: string): boolean {
    if (!input) return false;

    if (!this.#shell) {
      this.writeln(ansi.red('Error: Pucc not available'));
      return false;
    }

    this.#emit('pucc-command', { input });

    const controller = new AbortController();
    let pending: Promise<void> | undefined;
    try {
      pending = this.#shell.executeFromInput(input, this.#logger, controller.signal);
    } catch (error) {
      this.writeln(ansi.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
    }
    if (!pending) return false;

    const run = { controller, input };
    this.#running = run;
    this.#emit('pucc-command-start', { input });
    pending.then(() => {
      // Ignore runs already cancelled: the prompt is back and the handler finished late
      if (this.#running !== run) return;
      this.#running = null;
      this.#emit('pucc-command-end', { input, cancelled: false });
      this.#terminal?.write('\r\n');
      this.#writePrompt();
    });
    return true;
  }

  #cancelRunning() {
    const run = this.#running;
    if (!run) return;
    this.#running = null;
    run.controller.abort();
    this.#emit('pucc-command-end', { input: run.input, cancelled: true });
    this.#terminal?.write('^C\r\n');
    this.#writePrompt();
  }

  #emit(type: string, detail: Record<string, unknown>) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
  }

  #setupHotkeyListener() {
    if (this.#isEmbedded) return;
    this.#hotkeyAbort?.abort();
    this.#hotkeyAbort = new AbortController();
    document.addEventListener('keydown', this.#handleHotkey, {
      capture: true,
      signal: this.#hotkeyAbort.signal,
    });
  }

  #handleHotkey = (event: KeyboardEvent) => {
    const config = this.#hotkeyConfig;
    const keyMatch = event.key.toLowerCase() === config.key.toLowerCase();
    const altMatch = !!event.altKey === !!config.altKey;
    const ctrlMatch = !!event.ctrlKey === !!config.ctrlKey;
    const shiftMatch = !!event.shiftKey === !!config.shiftKey;
    const metaMatch = !!event.metaKey === !!config.metaKey;

    if (keyMatch && altMatch && ctrlMatch && shiftMatch && metaMatch) {
      const target = event.target as HTMLElement;
      if (
        !target ||
        (!target.isContentEditable && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA')
      ) {
        event.preventDefault();
        event.stopPropagation();
        this.toggle();
      }
    }
  };

  #parseHotkey(hotkeyString: string) {
    const parts = hotkeyString.toLowerCase().split('-');
    const key = parts[parts.length - 1];

    this.#hotkeyConfig = {
      key,
      altKey: parts.includes('alt'),
      ctrlKey: parts.includes('ctrl') || parts.includes('control'),
      shiftKey: parts.includes('shift'),
      metaKey: parts.includes('meta') || parts.includes('cmd'),
    };
  }

  #updateHeight() {
    const heightValue = parseHeightValue(this.getAttribute('height') || '400px');
    const style = this.shadowRoot?.querySelector('style');
    if (style?.textContent) {
      style.textContent = style.textContent.replace(
        /--shell-height:\s*[^;]+/,
        `--shell-height: ${heightValue}`
      );
    }
    this.#fitSoon();
  }

  #updateTheme() {
    const colors = getThemeColors(this.getAttribute('theme'));
    const style = this.shadowRoot?.querySelector('style');
    if (style?.textContent) {
      style.textContent = style.textContent
        .replace(/--shell-bg:\s*[^;]+/, `--shell-bg: ${colors.bg}`)
        .replace(/--shell-fg:\s*[^;]+/, `--shell-fg: ${colors.fg}`)
        .replace(/--shell-accent:\s*[^;]+/, `--shell-accent: ${colors.accent}`)
        .replace(/--shell-border:\s*[^;]+/, `--shell-border: ${colors.border}`)
        .replace(/--shell-shadow:\s*[^;]+/, `--shell-shadow: ${colors.shadow}`);
    }
    if (this.#terminal) {
      this.#terminal.options.theme = getXtermTheme(
        this.getAttribute('theme'),
        getComputedStyle(this)
      );
    }
  }

  #writePrompt() {
    this.#terminal?.write(ansi.green(this.#promptText));
  }

  #updatePrompt() {
    if (this.#terminal && this.#isVisible) {
      this.#writePrompt();
    }
  }

  #cleanup() {
    this.#hotkeyAbort?.abort();
    this.#hotkeyAbort = null;
    for (const id of this.#timers) clearTimeout(id);
    this.#timers.clear();
    this.#terminal?.dispose();
    this.#terminal = null;
    this.#fitAddon = null;
    this.#logger = null;
    this.#editor.reset();
  }

  #parsePuccOptions(optionsString: string | null) {
    if (!optionsString) {
      this.#puccOptions = null;
      return;
    }

    try {
      this.#puccOptions = JSON.parse(optionsString);
    } catch (error) {
      console.warn('Failed to parse pucc-options attribute:', error);
      this.#puccOptions = null;
    }
  }

  #initializeShell() {
    if (this.#puccOptions !== null) {
      this.#shell = new PuccClass(this.#puccOptions);
      this.#shell.initialize();
    } else {
      this.#shell = (window as Window & { Pucc?: Pucc }).Pucc || null;
    }
  }

  get visible(): boolean {
    return this.#isVisible;
  }

  set visible(value: boolean) {
    if (value) {
      this.show();
    } else {
      this.hide();
    }
  }

  get terminalInstance(): Terminal | null {
    return this.#terminal;
  }

  get shellInstance(): Pucc | null {
    return this.#shell;
  }

  set shellInstance(shell: Pucc) {
    this.#shell = shell;
  }

  get puccOptions(): PuccOptions | null {
    return this.#puccOptions;
  }

  set puccOptions(options: PuccOptions | null) {
    this.#puccOptions = options;
    this.#initializeShell();
  }

  /**
   * Command history, oldest first. Assign to restore a saved history (for example from
   * localStorage); save it by listening for `pucc-command` or reading this after each command.
   */
  get history(): string[] {
    return [...this.#editor.history.entries];
  }

  set history(entries: string[]) {
    this.#editor.history.load(entries);
  }

  getLogger(): TerminalLogger | null {
    return this.#logger;
  }

  get prompt(): string {
    return this.#promptText;
  }

  set prompt(value: string) {
    this.#promptText = value || '$ ';
    this.setAttribute('prompt', this.#promptText);
    this.#updatePrompt();
  }

  show() {
    if (this.#isVisible) return;
    this.#isVisible = true;
    if (this.#container) {
      this.#container.classList.add('visible');
      this.#defer(() => {
        this.#terminal?.focus();
        this.#fitAddon?.fit();
      });
    }
    this.dispatchEvent(new CustomEvent('pucc-show', { bubbles: true }));
  }

  hide() {
    if (!this.#isVisible) return;
    this.#isVisible = false;
    this.#container?.classList.remove('visible');
    this.dispatchEvent(new CustomEvent('pucc-hide', { bubbles: true }));
  }

  toggle() {
    if (this.#isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  write(text: string) {
    this.#terminal?.write(text);
  }

  writeln(text: string) {
    this.#terminal?.writeln(text);
  }

  clear() {
    if (this.#terminal) {
      this.#terminal.clear();
      this.#writePrompt();
    }
    this.#editor.reset();
  }
}

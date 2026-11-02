import type { Terminal } from '@xterm/xterm';
import * as ansi from '../ansi';

export class TerminalLogger {
  private terminal: Terminal;

  constructor(terminal: Terminal) {
    this.terminal = terminal;
  }

  write(message: string): void {
    this.terminal.write(message);
  }

  writeln(message: string): void {
    this.terminal.writeln(message);
  }

  info(message: string): void {
    this.writeln(message);
  }

  error(message: string): void {
    this.writeln(ansi.red(message));
  }

  warn(message: string): void {
    this.writeln(ansi.yellow(message));
  }

  success(message: string): void {
    this.writeln(ansi.green(message));
  }
}

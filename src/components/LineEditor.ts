import { CommandHistory } from './CommandHistory';

export interface EditResult {
  /** Escape sequences and text to write to the terminal */
  output: string;
  /** Set when the user pressed Enter; the trimmed line */
  submit?: string;
  /** Set when the user pressed Ctrl+C */
  cancelled?: boolean;
}

const CSI = '\x1b[';
const back = (n: number) => `${CSI}${n}D`;
const forward = (n: number) => `${CSI}${n}C`;
const ERASE_TO_END = `${CSI}K`;

/**
 * Terminal-agnostic single-line editor: consumes raw input data and returns the output to render
 */
export class LineEditor {
  #line = '';
  #cursor = 0;
  #history: CommandHistory;

  constructor(history: CommandHistory = new CommandHistory()) {
    this.#history = history;
  }

  get line(): string {
    return this.#line;
  }

  get cursor(): number {
    return this.#cursor;
  }

  get history(): CommandHistory {
    return this.#history;
  }

  reset(): void {
    this.#line = '';
    this.#cursor = 0;
    this.#history.reset();
  }

  handle(data: string): EditResult {
    switch (data) {
      case '\r':
      case '\n': {
        const submit = this.#line.trim();
        if (submit) this.#history.add(submit);
        this.reset();
        return { output: '', submit };
      }
      case '\x1b[D':
        if (this.#cursor === 0) return { output: '' };
        this.#cursor--;
        return { output: back(1) };
      case '\x1b[C':
        if (this.#cursor >= this.#line.length) return { output: '' };
        this.#cursor++;
        return { output: forward(1) };
      case '\x1b[A': {
        const entry = this.#history.previous(this.#line);
        return { output: entry === null ? '' : this.#replace(entry) };
      }
      case '\x1b[B': {
        const entry = this.#history.next();
        return { output: entry === null ? '' : this.#replace(entry) };
      }
      case '\x1b[H':
      case '\x01': {
        const moved = this.#cursor;
        this.#cursor = 0;
        return { output: moved > 0 ? back(moved) : '' };
      }
      case '\x1b[F':
      case '\x05': {
        const remaining = this.#line.length - this.#cursor;
        this.#cursor = this.#line.length;
        return { output: remaining > 0 ? forward(remaining) : '' };
      }
      case '\x1b[3~':
        if (this.#cursor >= this.#line.length) return { output: '' };
        this.#line = this.#line.slice(0, this.#cursor) + this.#line.slice(this.#cursor + 1);
        return { output: this.#redrawTail() };
      case '\x7f':
      case '\b':
        if (this.#cursor === 0) return { output: '' };
        this.#line = this.#line.slice(0, this.#cursor - 1) + this.#line.slice(this.#cursor);
        this.#cursor--;
        return { output: `\b${this.#redrawTail()}` };
      case '\x03':
        this.reset();
        return { output: '^C\r\n', cancelled: true };
      case '\x15': {
        // Ctrl+U: kill to start of line
        if (this.#cursor === 0) return { output: '' };
        const moved = this.#cursor;
        this.#line = this.#line.slice(moved);
        this.#cursor = 0;
        const tail = this.#line.length > 0 ? back(this.#line.length) : '';
        return { output: back(moved) + ERASE_TO_END + this.#line + tail };
      }
    }

    if (data >= ' ' && !data.startsWith('\x1b')) return { output: this.#insert(data) };
    return { output: '' };
  }

  #insert(text: string): string {
    let output = '';
    for (const ch of text) {
      this.#line = this.#line.slice(0, this.#cursor) + ch + this.#line.slice(this.#cursor);
      this.#cursor++;
      const tail = this.#line.slice(this.#cursor - 1);
      output += tail + (tail.length > 1 ? back(tail.length - 1) : '');
    }
    return output;
  }

  /** Rewrite everything from the cursor, blank the leftover cell, then return to the cursor */
  #redrawTail(): string {
    const tail = this.#line.slice(this.#cursor);
    return `${tail} ${back(tail.length + 1)}`;
  }

  #replace(next: string): string {
    const output = (this.#cursor > 0 ? back(this.#cursor) : '') + ERASE_TO_END + next;
    this.#line = next;
    this.#cursor = next.length;
    return output;
  }
}

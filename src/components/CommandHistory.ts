/**
 * Bounded command history with shell-style up/down navigation
 */
export class CommandHistory {
  #entries: string[] = [];
  #index = -1;
  #saved = '';
  #limit: number;

  constructor(limit = 100) {
    this.#limit = limit;
  }

  get entries(): readonly string[] {
    return this.#entries;
  }

  add(entry: string): void {
    this.#entries.push(entry);
    if (this.#entries.length > this.#limit) this.#entries.shift();
  }

  /** Stop navigating; the next `previous` starts from the newest entry */
  reset(): void {
    this.#index = -1;
    this.#saved = '';
  }

  /** Step back in history, remembering `current` on the first step. Null if there is nowhere to go. */
  previous(current: string): string | null {
    if (this.#entries.length === 0) return null;
    if (this.#index === -1) {
      this.#saved = current;
      this.#index = this.#entries.length - 1;
    } else if (this.#index > 0) {
      this.#index--;
    } else {
      return null;
    }
    return this.#entries[this.#index];
  }

  /** Step forward in history, returning the remembered line after the newest entry. Null if not navigating. */
  next(): string | null {
    if (this.#index === -1) return null;
    if (this.#index < this.#entries.length - 1) {
      this.#index++;
      return this.#entries[this.#index];
    }
    this.#index = -1;
    return this.#saved;
  }
}

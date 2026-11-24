import type { ParsedArgs } from '../types';

/** A single whitespace-delimited word and where it sits in the input */
export interface Token {
  /** Unquoted, unescaped value */
  value: string;
  /** Offset of the first character (including any opening quote) in the input */
  start: number;
  /** Offset just past the last character (including any closing quote) */
  end: number;
  /** Quote character the word ends inside of, or null if it is not inside an open quote */
  quote: '"' | "'" | null;
  /** True when the word contained quotes, even if they were empty (`""`) */
  quoted: boolean;
}

const isSpace = (char: string) => /\s/.test(char);

/**
 * Read one word starting at `from`.
 * - `'...'` is literal; `"..."` honours `\"` and `\\`; outside quotes `\x` yields `x`
 * - Quotes may appear mid-word (`my" dir"/file`); an unterminated quote runs to the end of input
 */
function readWord(input: string, from: number): Token {
  let i = from;
  let value = '';
  let quote: '"' | "'" | null = null;
  let quoted = false;

  while (i < input.length) {
    const char = input[i];

    if (quote === "'") {
      if (char === "'") quote = null;
      else value += char;
    } else if (quote === '"') {
      if (char === '"') {
        quote = null;
      } else if (char === '\\' && (input[i + 1] === '"' || input[i + 1] === '\\')) {
        value += input[++i];
      } else {
        value += char;
      }
    } else if (char === '"' || char === "'") {
      quote = char;
      quoted = true;
    } else if (char === '\\' && i + 1 < input.length) {
      value += input[++i];
    } else if (isSpace(char)) {
      break;
    } else {
      value += char;
    }
    i++;
  }

  return { value, start: from, end: i, quote, quoted };
}

/**
 * Split input into words with quote and escape handling, keeping source offsets.
 * Useful for tab completion: the last token tells you what is being typed and whether
 * it is inside an open quote.
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    while (i < input.length && isSpace(input[i])) i++;
    if (i >= input.length) break;
    const token = readWord(input, i);
    tokens.push(token);
    i = token.end;
  }

  return tokens;
}

/**
 * Quote a value so it parses back as a single argument.
 * Leaves plain values alone. With `quote` (the quote a token is already inside, from
 * `Token.quote`) it escapes for that context without adding quotes.
 */
export function quoteArg(value: string, quote: '"' | "'" | null = null): string {
  if (quote === "'") return value.replace(/'/g, `'\\''`);
  if (quote === '"') return value.replace(/["\\]/g, '\\$&');
  if (value !== '' && !/[\s"'\\]/.test(value)) return value;
  return `"${value.replace(/["\\]/g, '\\$&')}"`;
}

function coerce(value: string): string | number | boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d*\.\d+$/.test(value)) return parseFloat(value);
  return value;
}

/**
 * Parses command strings into structured arguments
 * Supports both positional arguments and key=value pairs, with single/double quotes
 * and backslash escapes (see `tokenize`)
 *
 * Examples:
 * - `$new customer` → `{ _: ['customer'] }`
 * - `name="John Smith" balance=5400` → `{ name: "John Smith", balance: 5400 }`
 * - `$new customer name="John"` → `{ _: ['customer'], name: "John" }`
 * - `cat "my docs/a.txt"` or `cat my\ docs/a.txt` → `{ _: ['cat', 'my docs/a.txt'] }`
 */
export function parse(input: string): ParsedArgs {
  const args: ParsedArgs = { _: [] };
  const text = input.trim();
  let i = 0;

  while (i < text.length) {
    while (i < text.length && isSpace(text[i])) i++;
    if (i >= text.length) break;

    // key=value: identifier followed by =
    const keyMatch = text.slice(i).match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=/);

    if (keyMatch) {
      i += keyMatch[0].length;
      while (i < text.length && isSpace(text[i])) i++;
      const token = readWord(text, i);
      args[keyMatch[1]] = coerce(token.value);
      i = token.end;
    } else {
      const token = readWord(text, i);
      if (token.value || token.quoted) args._.push(token.value);
      i = token.end;
    }
  }

  return args;
}

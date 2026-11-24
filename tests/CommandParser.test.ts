import { describe, expect, it } from 'vitest';
import * as CommandParser from '../src/core/CommandParser';

describe('CommandParser', () => {
  it('returns empty args for blank input', () => {
    expect(CommandParser.parse('')).toEqual({ _: [] });
    expect(CommandParser.parse('   ')).toEqual({ _: [] });
  });

  it('parses positional arguments', () => {
    expect(CommandParser.parse('new customer')).toEqual({ _: ['new', 'customer'] });
  });

  it('keeps quoted positional arguments together', () => {
    expect(CommandParser.parse('say "hello world"')).toEqual({ _: ['say', 'hello world'] });
    expect(CommandParser.parse("say 'hello world'")).toEqual({ _: ['say', 'hello world'] });
  });

  it('parses key=value pairs', () => {
    expect(CommandParser.parse('name=John')).toEqual({ _: [], name: 'John' });
  });

  it('parses quoted values', () => {
    expect(CommandParser.parse('name="John Smith"')).toEqual({ _: [], name: 'John Smith' });
  });

  it('coerces numbers and booleans', () => {
    expect(CommandParser.parse('a=5 b=-3 c=1.5 d=true e=false f=007x')).toEqual({
      _: [],
      a: 5,
      b: -3,
      c: 1.5,
      d: true,
      e: false,
      f: '007x',
    });
  });

  it('mixes positional and key=value arguments', () => {
    expect(CommandParser.parse('customer name="John" balance=5400')).toEqual({
      _: ['customer'],
      name: 'John',
      balance: 5400,
    });
  });

  it('allows whitespace around =', () => {
    expect(CommandParser.parse('name = John')).toEqual({ _: [], name: 'John' });
  });

  it('supports backslash escapes and mid-word quotes', () => {
    expect(CommandParser.parse('cat my\\ docs/a.txt')._).toEqual(['cat', 'my docs/a.txt']);
    expect(CommandParser.parse('cat my" dir"/f')._).toEqual(['cat', 'my dir/f']);
    expect(CommandParser.parse('say "a \\"b\\""')._).toEqual(['say', 'a "b"']);
    expect(CommandParser.parse("say 'a\\b'")._).toEqual(['say', 'a\\b']);
  });

  it('keeps empty quoted arguments and tolerates unterminated quotes', () => {
    expect(CommandParser.parse('say "" x')._).toEqual(['say', '', 'x']);
    expect(CommandParser.parse('cat "my do')._).toEqual(['cat', 'my do']);
  });

  describe('tokenize', () => {
    it('reports offsets and open quotes', () => {
      const tokens = CommandParser.tokenize('cat "my do');
      expect(tokens).toEqual([
        { value: 'cat', start: 0, end: 3, quote: null, quoted: false },
        { value: 'my do', start: 4, end: 10, quote: '"', quoted: true },
      ]);
    });

    it('returns no tokens for blank input', () => {
      expect(CommandParser.tokenize('  ')).toEqual([]);
    });
  });

  describe('quoteArg', () => {
    it('round-trips through parse', () => {
      for (const value of ['plain', 'my docs/a.txt', 'a"b', "it's", 'back\\slash', '']) {
        expect(CommandParser.parse(`x ${CommandParser.quoteArg(value)}`)._[1]).toBe(value);
      }
    });

    it('escapes for an open quote', () => {
      expect(CommandParser.quoteArg('a"b', '"')).toBe('a\\"b');
      expect(CommandParser.quoteArg("it's", "'")).toBe("it'\\''s");
    });
  });
});

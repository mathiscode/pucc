import { describe, expect, it } from 'vitest';
import { CommandParser } from '../src/core/CommandParser';

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
});

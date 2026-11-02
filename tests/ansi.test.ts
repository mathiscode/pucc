import { describe, expect, it } from 'vitest';
import { bold, cyan, red } from '../src/ansi';

describe('ansi', () => {
  it('wraps text in an escape pair', () => {
    expect(red('x')).toBe('\x1b[31mx\x1b[39m');
  });

  it('nests', () => {
    expect(bold(cyan('x'))).toBe('\x1b[1m\x1b[36mx\x1b[39m\x1b[22m');
  });
});

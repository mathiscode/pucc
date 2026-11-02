import { describe, expect, it } from 'vitest';
import { CommandHistory } from '../src/components/CommandHistory';
import { LineEditor } from '../src/components/LineEditor';

const type = (editor: LineEditor, text: string) => {
  for (const ch of text) editor.handle(ch);
};

describe('CommandHistory', () => {
  it('walks back and forward, restoring the in-progress line', () => {
    const h = new CommandHistory();
    h.add('one');
    h.add('two');
    expect(h.previous('draft')).toBe('two');
    expect(h.previous('ignored')).toBe('one');
    expect(h.previous('ignored')).toBeNull();
    expect(h.next()).toBe('two');
    expect(h.next()).toBe('draft');
    expect(h.next()).toBeNull();
  });

  it('returns null when empty', () => {
    expect(new CommandHistory().previous('x')).toBeNull();
  });

  it('keeps only the newest entries up to the limit', () => {
    const h = new CommandHistory(2);
    for (const e of ['a', 'b', 'c']) h.add(e);
    expect(h.entries).toEqual(['b', 'c']);
  });
});

describe('LineEditor', () => {
  it('inserts text and echoes it', () => {
    const e = new LineEditor();
    expect(e.handle('a').output).toBe('a');
    type(e, 'bc');
    expect(e.line).toBe('abc');
    expect(e.cursor).toBe(3);
  });

  it('inserts mid-line and redraws the tail', () => {
    const e = new LineEditor();
    type(e, 'ac');
    e.handle('\x1b[D');
    expect(e.handle('b').output).toBe('bc\x1b[1D');
    expect(e.line).toBe('abc');
    expect(e.cursor).toBe(2);
  });

  it('moves with arrows, home and end within bounds', () => {
    const e = new LineEditor();
    type(e, 'abc');
    expect(e.handle('\x1b[C').output).toBe('');
    expect(e.handle('\x01').output).toBe('\x1b[3D');
    expect(e.handle('\x1b[D').output).toBe('');
    expect(e.handle('\x05').output).toBe('\x1b[3C');
    expect(e.cursor).toBe(3);
  });

  it('backspaces and deletes', () => {
    const e = new LineEditor();
    type(e, 'abc');
    e.handle('\x7f');
    expect(e.line).toBe('ab');
    e.handle('\x1b[D');
    e.handle('\x1b[3~');
    expect(e.line).toBe('a');
    e.handle('\x01');
    expect(e.handle('\x7f').output).toBe('');
  });

  it('kills to start of line with Ctrl+U', () => {
    const e = new LineEditor();
    type(e, 'hello');
    e.handle('\x1b[D');
    e.handle('\x15');
    expect(e.line).toBe('o');
    expect(e.cursor).toBe(0);
  });

  it('submits the trimmed line and records history', () => {
    const e = new LineEditor();
    type(e, '  echo hi ');
    expect(e.handle('\r')).toEqual({ output: '', submit: 'echo hi' });
    expect(e.line).toBe('');
    expect(e.history.entries).toEqual(['echo hi']);
  });

  it('does not record blank submissions', () => {
    const e = new LineEditor();
    type(e, '   ');
    expect(e.handle('\r').submit).toBe('');
    expect(e.history.entries).toEqual([]);
  });

  it('recalls history with up and down', () => {
    const e = new LineEditor();
    type(e, 'one');
    e.handle('\r');
    type(e, 'two');
    e.handle('\r');
    type(e, 'dra');
    e.handle('\x1b[A');
    expect(e.line).toBe('two');
    e.handle('\x1b[A');
    expect(e.line).toBe('one');
    e.handle('\x1b[B');
    e.handle('\x1b[B');
    expect(e.line).toBe('dra');
  });

  it('cancels with Ctrl+C', () => {
    const e = new LineEditor();
    type(e, 'abc');
    expect(e.handle('\x03')).toEqual({ output: '^C\r\n', cancelled: true });
    expect(e.line).toBe('');
  });

  it('ignores unknown escape sequences', () => {
    const e = new LineEditor();
    expect(e.handle('\x1b[Z').output).toBe('');
    expect(e.line).toBe('');
  });

  it('accepts pasted multi-character input', () => {
    const e = new LineEditor();
    e.handle('hello');
    expect(e.line).toBe('hello');
    expect(e.cursor).toBe(5);
  });
});

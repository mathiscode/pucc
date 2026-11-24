import { describe, expect, it } from 'vitest';
import { CommandHistory } from '../src/components/CommandHistory';

describe('CommandHistory seeding', () => {
  it('loads entries and navigates them', () => {
    const history = new CommandHistory();
    history.load(['a', 'b', '', 'c']);
    expect(history.entries).toEqual(['a', 'b', 'c']);
    expect(history.previous('')).toBe('c');
    expect(history.previous('')).toBe('b');
  });

  it('keeps only the newest entries within the limit', () => {
    const history = new CommandHistory(2);
    history.load(['a', 'b', 'c']);
    expect(history.entries).toEqual(['b', 'c']);
    history.limit = 1;
    expect(history.entries).toEqual(['c']);
    history.add('d');
    expect(history.entries).toEqual(['d']);
  });

  it('ends navigation when reloaded', () => {
    const history = new CommandHistory();
    history.load(['a', 'b']);
    history.previous('x');
    history.load(['z']);
    expect(history.next()).toBeNull();
  });
});

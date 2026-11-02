import { afterEach, describe, expect, it, vi } from 'vitest';
import { Pucc } from '../src/core/Pucc';

const noop = () => {};

describe('Pucc', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('registers the built-in commands', () => {
      const names = new Pucc().getCommands().map(c => c.name);
      expect(names).toEqual(expect.arrayContaining(['help', 'about', 'echo']));
    });

    it('defaults the prefix to $', () => {
      expect(new Pucc().getCommandPrefix()).toBe('$');
    });

    it('accepts a custom prefix', () => {
      expect(new Pucc({ commandPrefix: '_' }).getCommandPrefix()).toBe('_');
    });

    it('rejects an invalid prefix', () => {
      expect(() => new Pucc({ commandPrefix: '1x' })).toThrow(/Invalid command prefix/);
      expect(() => new Pucc({ commandPrefix: '' })).toThrow();
    });

    it('registers initial commands', () => {
      const pucc = new Pucc({
        initialCommands: [{ name: 'hi', description: 'Say hi', handler: noop }],
      });
      expect(pucc.getCommand('hi')?.description).toBe('Say hi');
    });
  });

  describe('addCommand / removeCommand', () => {
    it('adds and retrieves a command', () => {
      const pucc = new Pucc();
      pucc.addCommand('ping', noop, 'Ping');
      expect(pucc.getCommand('ping')).toMatchObject({ name: 'ping', description: 'Ping' });
    });

    it('falls back to a default description', () => {
      const pucc = new Pucc();
      pucc.addCommand('ping', noop, '');
      expect(pucc.getCommand('ping')?.description).toBe('No description provided');
    });

    it('validates name and handler', () => {
      const pucc = new Pucc();
      expect(() => pucc.addCommand('', noop, '')).toThrow();
      expect(() => pucc.addCommand('$ping', noop, '')).toThrow(/prefix/);
      expect(() => pucc.addCommand('ping', 'x' as never, '')).toThrow(/function/);
    });

    it('warns when overwriting', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(noop);
      const pucc = new Pucc();
      pucc.addCommand('ping', noop, 'a');
      pucc.addCommand('ping', noop, 'b');
      expect(warn).toHaveBeenCalled();
      expect(pucc.getCommand('ping')?.description).toBe('b');
    });

    it('removes a command', () => {
      const pucc = new Pucc();
      pucc.addCommand('ping', noop, 'Ping');
      expect(pucc.removeCommand('ping')).toBe(true);
      expect(pucc.getCommand('ping')).toBeUndefined();
      expect(pucc.removeCommand('ping')).toBe(false);
    });
  });

  describe('window registration', () => {
    it('attaches prefixed and plain functions to window', () => {
      const pucc = new Pucc();
      const handler = vi.fn();
      pucc.addCommand('winping', handler, 'Ping');
      const w = window as unknown as Record<string, (...a: string[]) => void>;
      w.$winping('a', 'b=1');
      expect(handler).toHaveBeenCalledWith({ _: ['a'], b: 1 }, pucc);
      expect(typeof w.winping).toBe('function');
    });

    it('detaches on removal', () => {
      const pucc = new Pucc();
      pucc.addCommand('winrm', noop, '');
      pucc.removeCommand('winrm');
      const w = window as unknown as Record<string, unknown>;
      expect(w.$winrm).toBeUndefined();
      expect(w.winrm).toBeUndefined();
    });

    it('skips window registration when disabled', () => {
      const pucc = new Pucc({ enableGlobalRegistrations: false });
      pucc.addCommand('winoff', noop, '');
      expect((window as unknown as Record<string, unknown>).$winoff).toBeUndefined();
    });
  });

  describe('execute', () => {
    it('passes parsed args and the instance to the handler', () => {
      const pucc = new Pucc();
      const handler = vi.fn();
      pucc.addCommand('run', handler, '');
      pucc.execute('run', 'x name="A B"');
      expect(handler).toHaveBeenCalledWith({ _: ['x'], name: 'A B' }, pucc);
    });

    it('reports unknown commands to the logger', () => {
      vi.spyOn(console, 'error').mockImplementation(noop);
      const logger = { error: vi.fn() };
      new Pucc().execute('nope', '', logger as never);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Command "nope" not found')
      );
    });

    it('reports handler errors to the logger', () => {
      vi.spyOn(console, 'error').mockImplementation(noop);
      const logger = { error: vi.fn() };
      const pucc = new Pucc();
      pucc.addCommand(
        'boom',
        () => {
          throw new Error('bad');
        },
        ''
      );
      pucc.execute('boom', '', logger as never);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('bad'));
    });

    it('reports async handler rejections to the console', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(noop);
      const pucc = new Pucc();
      pucc.addCommand(
        'aboom',
        async () => {
          throw new Error('async bad');
        },
        ''
      );
      pucc.execute('aboom', '');
      await new Promise(r => setTimeout(r, 0));
      expect(error).toHaveBeenCalledWith(expect.stringContaining('async bad'));
    });

    // Known bug: the scoped logger is restored in `finally` before the rejection
    // arrives, so the scoped logger never sees async errors.
    it.fails('reports async handler rejections to the scoped logger', async () => {
      vi.spyOn(console, 'error').mockImplementation(noop);
      const logger = { error: vi.fn() };
      const pucc = new Pucc();
      pucc.addCommand(
        'aboom',
        async () => {
          throw new Error('async bad');
        },
        ''
      );
      pucc.execute('aboom', '', logger as never);
      await new Promise(r => setTimeout(r, 0));
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('async bad'));
    });

    it('restores the previous logger after a scoped call', () => {
      const pucc = new Pucc();
      const original = { error: vi.fn() };
      pucc.setLogger(original as never);
      pucc.execute('echo', 'x', { writeln: vi.fn(), write: vi.fn() } as never);
      expect(pucc.getLogger()).toBe(original);
    });
  });

  describe('executeFromInput', () => {
    it('strips the prefix and splits args', () => {
      const pucc = new Pucc();
      const handler = vi.fn();
      pucc.addCommand('go', handler, '');
      pucc.executeFromInput('$go there now');
      expect(handler).toHaveBeenCalledWith({ _: ['there', 'now'] }, pucc);
    });

    it('works without a prefix and ignores blank input', () => {
      const pucc = new Pucc();
      const handler = vi.fn();
      pucc.addCommand('go', handler, '');
      pucc.executeFromInput('go');
      pucc.executeFromInput('   ');
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});

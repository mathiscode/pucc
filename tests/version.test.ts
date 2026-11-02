import { describe, expect, it } from 'vitest';
import { packageJson } from '../config/shared.mjs';
import { VERSION } from '../src/version';

describe('VERSION', () => {
  it('matches package.json', () => {
    expect(VERSION).toBe(packageJson.version);
  });
});

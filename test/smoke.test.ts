import { describe, it, expect } from 'vitest';
import { main } from '../src/cli.js';

describe('cli smoke', () => {
  it('returns 0 for an empty invocation', () => {
    expect(main(['node', 'cli.js'])).toBe(0);
  });
});

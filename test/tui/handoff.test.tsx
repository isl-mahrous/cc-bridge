import { describe, it, expect } from 'vitest';
import { renderHandoff } from '../../src/tui/App.js';

describe('renderHandoff', () => {
  it('returns a handoff command when provided', () => {
    const result = renderHandoff({ command: 'claude', args: ['--resume', 'x'], cwd: '/tmp' });
    expect(result.command).toBe('claude');
    expect(result.args).toEqual(['--resume', 'x']);
    expect(result.cwd).toBe('/tmp');
  });
});

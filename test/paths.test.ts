import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolvePaths } from '../src/paths.js';
import { homedir } from 'node:os';
import path from 'node:path';

describe('resolvePaths', () => {
  const origEnv = process.env.CC_BRIDGE_TEST_ROOT;
  afterEach(() => {
    if (origEnv === undefined) delete process.env.CC_BRIDGE_TEST_ROOT;
    else process.env.CC_BRIDGE_TEST_ROOT = origEnv;
  });

  it('points at real user paths when no override', () => {
    delete process.env.CC_BRIDGE_TEST_ROOT;
    const p = resolvePaths();
    expect(p.cliProjects).toBe(path.join(homedir(), '.claude', 'projects'));
    expect(p.desktopSessions).toBe(
      path.join(homedir(), 'Library', 'Application Support', 'Claude', 'claude-code-sessions'),
    );
    expect(p.bridgeHome).toBe(path.join(homedir(), '.cc-bridge'));
  });

  it('relocates every path under CC_BRIDGE_TEST_ROOT when set', () => {
    process.env.CC_BRIDGE_TEST_ROOT = '/tmp/cc-bridge-fake';
    const p = resolvePaths();
    expect(p.cliProjects).toBe('/tmp/cc-bridge-fake/.claude/projects');
    expect(p.desktopSessions).toBe(
      '/tmp/cc-bridge-fake/Library/Application Support/Claude/claude-code-sessions',
    );
    expect(p.bridgeHome).toBe('/tmp/cc-bridge-fake/.cc-bridge');
  });
});

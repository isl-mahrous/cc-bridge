import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { tailHistory } from '../../src/commands/history.js';
import { logAction } from '../../src/history-log.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'cc-bridge-hist-'));
  process.env.CC_BRIDGE_TEST_ROOT = root;
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  delete process.env.CC_BRIDGE_TEST_ROOT;
});

describe('tailHistory', () => {
  it('returns the most recent N entries in log order', async () => {
    await logAction({ action: 'link', cliSessionId: 'a', manifestPath: '/m/a.json', manifestSessionId: 'local_a', cwd: '/p' });
    await logAction({ action: 'link', cliSessionId: 'b', manifestPath: '/m/b.json', manifestSessionId: 'local_b', cwd: '/p' });
    await logAction({ action: 'unlink', cliSessionId: 'a', manifestPath: '/m/a.json' });
    const t = await tailHistory({ limit: 2 });
    expect(t.map((r) => r.action)).toEqual(['link', 'unlink']);
  });

  it('returns all when limit exceeds size', async () => {
    const t = await tailHistory({ limit: 99 });
    expect(t).toEqual([]);
  });
});

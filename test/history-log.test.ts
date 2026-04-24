import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { logAction, readHistory } from '../src/history-log.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'cc-bridge-log-'));
  process.env.CC_BRIDGE_TEST_ROOT = root;
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  delete process.env.CC_BRIDGE_TEST_ROOT;
});

describe('history-log', () => {
  it('creates the log file on first append and is empty before', async () => {
    expect(await readHistory()).toEqual([]);
    await logAction({ action: 'link', cliSessionId: 'abc', manifestPath: '/tmp/m.json', manifestSessionId: 'local_x', cwd: '/tmp/p' });
    const h = await readHistory();
    expect(h.length).toBe(1);
    expect(h[0]!.action).toBe('link');
    expect(h[0]!.cliSessionId).toBe('abc');
    expect(typeof h[0]!.ts).toBe('string');
  });

  it('appends new records in order', async () => {
    await logAction({ action: 'link', cliSessionId: 'a', manifestPath: '/m/a.json', manifestSessionId: 'local_a', cwd: '/p' });
    await logAction({ action: 'unlink', cliSessionId: 'a', manifestPath: '/m/a.json' });
    const h = await readHistory();
    expect(h.map((r) => r.action)).toEqual(['link', 'unlink']);
  });
});

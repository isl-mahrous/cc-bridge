import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { logAction, readHistory, manifestsCreatedForCliSession } from '../src/history-log.js';

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

describe('manifestsCreatedForCliSession', () => {
  it('returns [] when nothing has been linked', async () => {
    expect(await manifestsCreatedForCliSession('x')).toEqual([]);
  });

  it('returns the linked manifest path after a link', async () => {
    await logAction({ action: 'link', cliSessionId: 's1', manifestPath: '/m/a.json', manifestSessionId: 'local_a', cwd: '/p' });
    expect(await manifestsCreatedForCliSession('s1')).toEqual(['/m/a.json']);
  });

  it('returns [] after link + unlink for the same path', async () => {
    await logAction({ action: 'link', cliSessionId: 's2', manifestPath: '/m/b.json', manifestSessionId: 'local_b', cwd: '/p' });
    await logAction({ action: 'unlink', cliSessionId: 's2', manifestPath: '/m/b.json' });
    expect(await manifestsCreatedForCliSession('s2')).toEqual([]);
  });

  it('returns only the live entry when multiple manifests linked for the same session', async () => {
    await logAction({ action: 'link', cliSessionId: 's3', manifestPath: '/m/c.json', manifestSessionId: 'local_c', cwd: '/p' });
    await logAction({ action: 'link', cliSessionId: 's3', manifestPath: '/m/d.json', manifestSessionId: 'local_d', cwd: '/p' });
    await logAction({ action: 'unlink', cliSessionId: 's3', manifestPath: '/m/c.json' });
    expect(await manifestsCreatedForCliSession('s3')).toEqual(['/m/d.json']);
  });

  it('ignores unlink for a path that was never linked', async () => {
    await logAction({ action: 'unlink', cliSessionId: 's4', manifestPath: '/m/never.json' });
    expect(await manifestsCreatedForCliSession('s4')).toEqual([]);
  });
});

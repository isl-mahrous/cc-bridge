import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { listSessions } from '../../src/commands/list.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'cc-bridge-list-'));
  process.env.CC_BRIDGE_TEST_ROOT = root;
  const proj = path.join(root, '.claude/projects/-tmp-proj');
  mkdirSync(proj, { recursive: true });
  const jsonl = [
    JSON.stringify({ type: 'user', timestamp: '2026-04-20T10:00:00.000Z', cwd: '/tmp/proj', message: { role: 'user', content: 'Hi' } }),
  ].join('\n') + '\n';
  writeFileSync(path.join(proj, 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa.jsonl'), jsonl);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  delete process.env.CC_BRIDGE_TEST_ROOT;
});

describe('listSessions', () => {
  it('returns both CLI and desktop rows when source is "all"', async () => {
    const rows = await listSessions({ source: 'all' });
    expect(rows.some((r) => r.surface === 'cli')).toBe(true);
  });

  it('filters by source', async () => {
    const rows = await listSessions({ source: 'cli' });
    expect(rows.every((r) => r.surface === 'cli')).toBe(true);
  });

  it('filters by cwd', async () => {
    const rows = await listSessions({ source: 'cli', cwd: '/nope' });
    expect(rows).toEqual([]);
  });
});

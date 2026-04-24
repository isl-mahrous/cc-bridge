import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { discoverDesktopSessions, loadDesktopManifests } from '../../src/discovery/desktop.js';

let root: string;

function manifest(partial: Record<string, unknown>): string {
  return JSON.stringify({
    sessionId: 'local_xxxx',
    cliSessionId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
    cwd: '/tmp/proj',
    originCwd: '/tmp/proj',
    createdAt: 0,
    lastActivityAt: 0,
    model: 'claude-sonnet-4-6',
    isArchived: false,
    title: 'Hi',
    permissionMode: 'default',
    enabledMcpTools: {},
    remoteMcpServersConfig: [],
    ...partial,
  });
}

const JSONL = JSON.stringify({
  type: 'user',
  timestamp: '2026-04-20T10:00:00.000Z',
  cwd: '/tmp/proj',
  message: { role: 'user', content: 'Hi' },
}) + '\n';

beforeAll(() => {
  root = mkdtempSync(path.join(tmpdir(), 'cc-bridge-test-'));
  process.env.CC_BRIDGE_TEST_ROOT = root;
  const dsRoot = path.join(root, 'Library', 'Application Support', 'Claude', 'claude-code-sessions');
  const ws = path.join(dsRoot, 'ws-a', 'ws-b');
  mkdirSync(ws, { recursive: true });
  writeFileSync(path.join(ws, 'local_one.json'), manifest({ sessionId: 'local_one', title: 'One' }));
  writeFileSync(
    path.join(ws, 'local_two.json'),
    manifest({ sessionId: 'local_two', title: 'Two', cliSessionId: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb' }),
  );
  const cliProj = path.join(root, '.claude', 'projects', '-tmp-proj');
  mkdirSync(cliProj, { recursive: true });
  writeFileSync(path.join(cliProj, 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa.jsonl'), JSONL);
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
  delete process.env.CC_BRIDGE_TEST_ROOT;
});

describe('loadDesktopManifests', () => {
  it('returns one record per manifest with absolute path', async () => {
    const ms = await loadDesktopManifests();
    expect(ms.length).toBe(2);
    expect(ms[0]!.manifestPath.endsWith('.json')).toBe(true);
    expect(ms[0]!.manifest.sessionId.startsWith('local_')).toBe(true);
  });
});

describe('discoverDesktopSessions', () => {
  it('returns summaries keyed on cliSessionId', async () => {
    const rows = await discoverDesktopSessions();
    const ids = rows.map((r) => r.cliSessionId).sort();
    expect(ids).toEqual(['aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb']);
    expect(rows[0]!.surface).toBe('desktop');
  });

  it('uses JSONL summary data when the backing file exists', async () => {
    const rows = await discoverDesktopSessions();
    const r = rows.find((x) => x.cliSessionId === 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa')!;
    expect(r.jsonlPath.endsWith('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa.jsonl')).toBe(true);
    expect(r.eventCount).toBeGreaterThan(0);
  });
});

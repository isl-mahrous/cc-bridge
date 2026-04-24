import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { linkSession } from '../../src/commands/link.js';
import { unlinkSession } from '../../src/commands/unlink.js';

let root: string;
const CID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'cc-bridge-unlink-'));
  process.env.CC_BRIDGE_TEST_ROOT = root;
  const proj = path.join(root, '.claude/projects/-tmp-proj');
  mkdirSync(proj, { recursive: true });
  writeFileSync(path.join(proj, `${CID}.jsonl`),
    JSON.stringify({ type: 'user', timestamp: '2026-04-20T10:00:00.000Z', cwd: '/tmp/proj', message: { role: 'user', content: 'Hi' } }) + '\n');
  const ws = path.join(root, 'Library/Application Support/Claude/claude-code-sessions/a/b');
  mkdirSync(ws, { recursive: true });
  writeFileSync(path.join(ws, 'local_seed.json'), '{}');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  delete process.env.CC_BRIDGE_TEST_ROOT;
});

describe('unlinkSession', () => {
  it('removes a manifest we created', async () => {
    const link = await linkSession({ cliSessionId: CID });
    const r = await unlinkSession({ cliSessionId: CID });
    expect(r.removed).toEqual([link.manifestPath]);
    expect(existsSync(link.manifestPath)).toBe(false);
  });

  it('refuses to touch foreign manifests', async () => {
    const foreign = path.join(
      root,
      'Library/Application Support/Claude/claude-code-sessions/a/b/local_foreign.json',
    );
    writeFileSync(foreign, JSON.stringify({
      sessionId: 'local_foreign',
      cliSessionId: CID,
      cwd: '/tmp/proj',
      originCwd: '/tmp/proj',
      createdAt: 0, lastActivityAt: 0,
      model: 'claude-sonnet-4-6',
      isArchived: false, title: 'Foreign',
      permissionMode: 'default',
      enabledMcpTools: {}, remoteMcpServersConfig: [],
    }));
    const r = await unlinkSession({ cliSessionId: CID });
    expect(r.removed).toEqual([]);
    expect(r.skippedForeign.length).toBe(1);
    expect(existsSync(foreign)).toBe(true);
  });

  it('reports when nothing exists', async () => {
    const r = await unlinkSession({ cliSessionId: CID });
    expect(r.removed).toEqual([]);
    expect(r.skippedForeign).toEqual([]);
  });
});

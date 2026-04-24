import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { linkSession } from '../../src/commands/link.js';
import { readHistory } from '../../src/history-log.js';

let root: string;
const CID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'cc-bridge-link-'));
  process.env.CC_BRIDGE_TEST_ROOT = root;
  const proj = path.join(root, '.claude/projects/-tmp-proj');
  mkdirSync(proj, { recursive: true });
  const jsonl = [
    JSON.stringify({ type: 'user', timestamp: '2026-04-20T10:00:00.000Z', cwd: '/tmp/proj', message: { role: 'user', content: 'Hi' } }),
    JSON.stringify({ type: 'assistant', timestamp: '2026-04-20T10:01:00.000Z', model: 'claude-sonnet-4-6', message: { role: 'assistant', content: [{ type: 'text', text: 'Hey' }] } }),
  ].join('\n') + '\n';
  writeFileSync(path.join(proj, `${CID}.jsonl`), jsonl);
  const ws = path.join(root, 'Library/Application Support/Claude/claude-code-sessions/a/b');
  mkdirSync(ws, { recursive: true });
  writeFileSync(path.join(ws, 'local_seed.json'), '{}');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  delete process.env.CC_BRIDGE_TEST_ROOT;
});

describe('linkSession', () => {
  it('writes a manifest and records to history', async () => {
    const r = await linkSession({ cliSessionId: CID });
    expect(r.status).toBe('linked');
    expect(r.manifestPath.endsWith('.json')).toBe(true);
    const parsed = JSON.parse(readFileSync(r.manifestPath, 'utf-8'));
    expect(parsed.cliSessionId).toBe(CID);
    const hist = await readHistory();
    expect(hist.some((h) => h.action === 'link')).toBe(true);
  });

  it('no-ops when a cc-bridge manifest already points at the session', async () => {
    await linkSession({ cliSessionId: CID });
    const r = await linkSession({ cliSessionId: CID });
    expect(r.status).toBe('already-linked-by-us');
  });

  it('no-ops when a foreign manifest already points at the session', async () => {
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
    const r = await linkSession({ cliSessionId: CID });
    expect(r.status).toBe('already-linked-by-other');
  });

  it('errors when the CLI session does not exist', async () => {
    await expect(linkSession({ cliSessionId: 'deadbeef-dead-4bee-aaaa-aaaaaaaaaaaa' }))
      .rejects.toThrow(/not found/i);
  });
});

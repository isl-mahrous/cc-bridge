import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { discoverCliSessions } from '../../src/discovery/cli.js';

let root: string;

const SESSION_JSONL = [
  JSON.stringify({ type: 'user', timestamp: '2026-04-20T10:00:00.000Z', cwd: '/tmp/proj', message: { role: 'user', content: 'Hello world' } }),
  JSON.stringify({ type: 'assistant', timestamp: '2026-04-20T10:00:05.000Z', model: 'claude-sonnet-4-6', message: { role: 'assistant', content: [{ type: 'text', text: 'Hi' }] } }),
].join('\n') + '\n';

beforeAll(() => {
  root = mkdtempSync(path.join(tmpdir(), 'cc-bridge-test-'));
  process.env.CC_BRIDGE_TEST_ROOT = root;
  const projDir = path.join(root, '.claude', 'projects', '-tmp-proj');
  mkdirSync(projDir, { recursive: true });
  // Top-level session (should be found)
  writeFileSync(path.join(projDir, 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa.jsonl'), SESSION_JSONL);
  // Subagent transcript (should be skipped)
  mkdirSync(path.join(projDir, 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb', 'subagents'), { recursive: true });
  writeFileSync(
    path.join(projDir, 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb', 'subagents', 'agent-xyz.jsonl'),
    SESSION_JSONL,
  );
  // Non-UUID filename (should be skipped)
  writeFileSync(path.join(projDir, 'notes.jsonl'), SESSION_JSONL);
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
  delete process.env.CC_BRIDGE_TEST_ROOT;
});

describe('discoverCliSessions', () => {
  it('finds only top-level UUID-named JSONLs', async () => {
    const rows = await discoverCliSessions();
    expect(rows.length).toBe(1);
    const r = rows[0]!;
    expect(r.surface).toBe('cli');
    expect(r.cliSessionId).toBe('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa');
    expect(r.cwd).toBe('/tmp/proj');
    expect(r.title).toBe('Hello world');
    expect(r.model).toBe('claude-sonnet-4-6');
    expect(r.hasBridgeManifest).toBe(false);
  });

  it('filters by cwd when option provided', async () => {
    const rows = await discoverCliSessions({ cwd: '/nope' });
    expect(rows).toEqual([]);
  });
});

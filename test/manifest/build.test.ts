import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildManifest } from '../../src/manifest/build.js';

let root: string;
let cliJsonl: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'cc-bridge-test-'));
  process.env.CC_BRIDGE_TEST_ROOT = root;
  const proj = path.join(root, '.claude/projects/-tmp-proj');
  mkdirSync(proj, { recursive: true });
  cliJsonl = path.join(proj, 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa.jsonl');
  writeFileSync(cliJsonl, [
    JSON.stringify({ type: 'user', timestamp: '2026-04-20T10:00:00.000Z', cwd: '/tmp/proj', message: { role: 'user', content: 'Hello world' } }),
    JSON.stringify({ type: 'permission-mode', permissionMode: 'bypassPermissions' }),
    JSON.stringify({ type: 'assistant', timestamp: '2026-04-20T10:05:00.000Z', model: 'claude-sonnet-4-6', message: { role: 'assistant', content: [{ type: 'text', text: 'Hi' }] } }),
  ].join('\n') + '\n');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  delete process.env.CC_BRIDGE_TEST_ROOT;
});

describe('buildManifest', () => {
  it('derives required fields from the JSONL', async () => {
    const m = await buildManifest({ cliJsonlPath: cliJsonl });
    expect(m.cliSessionId).toBe('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa');
    expect(m.sessionId.startsWith('local_')).toBe(true);
    expect(m.cwd).toBe('/tmp/proj');
    expect(m.originCwd).toBe('/tmp/proj');
    expect(m.createdAt).toBe(new Date('2026-04-20T10:00:00.000Z').getTime());
    expect(m.lastActivityAt).toBe(new Date('2026-04-20T10:05:00.000Z').getTime());
    expect(m.model).toBe('claude-sonnet-4-6');
    expect(m.title).toBe('Hello world');
    expect(m.permissionMode).toBe('bypassPermissions');
    expect(m.enabledMcpTools).toEqual({});
    expect(m.remoteMcpServersConfig).toEqual([]);
    expect(m.isArchived).toBe(false);
    expect(m).not.toHaveProperty('completedTurns');
  });

  it('accepts titleOverride and effortDefault', async () => {
    const m = await buildManifest({
      cliJsonlPath: cliJsonl,
      titleOverride: 'Custom',
      effortDefault: 'high',
    });
    expect(m.title).toBe('Custom');
    expect(m.effort).toBe('high');
  });
});

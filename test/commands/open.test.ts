import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildOpenInvocation } from '../../src/commands/open.js';

let root: string;
const CID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'cc-bridge-open-'));
  process.env.CC_BRIDGE_TEST_ROOT = root;
  const proj = path.join(root, '.claude/projects/-tmp-proj');
  mkdirSync(proj, { recursive: true });
  writeFileSync(path.join(proj, `${CID}.jsonl`),
    JSON.stringify({ type: 'user', timestamp: '2026-04-20T10:00:00.000Z', cwd: root, message: { role: 'user', content: 'Hi' } }) + '\n');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  delete process.env.CC_BRIDGE_TEST_ROOT;
});

describe('buildOpenInvocation', () => {
  it('returns the claude command and cwd for a known session', async () => {
    const inv = await buildOpenInvocation({ cliSessionId: CID });
    expect(inv.command).toBe('claude');
    expect(inv.args).toEqual(['--resume', CID]);
    expect(inv.cwd).toBe(root);
  });

  it('throws when the session is unknown', async () => {
    await expect(buildOpenInvocation({ cliSessionId: 'deadbeef-dead-4bee-aaaa-aaaaaaaaaaaa' }))
      .rejects.toThrow(/not found/i);
  });
});

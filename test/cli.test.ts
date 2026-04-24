// test/cli.test.ts — overwrite the file
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { main } from '../src/cli.js';

let root: string;
const CID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'cc-bridge-cli-'));
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

function capture(fn: () => Promise<number>): Promise<{ code: number; out: string }> {
  const chunks: string[] = [];
  const origWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((c: unknown) => { chunks.push(String(c)); return true; }) as typeof process.stdout.write;
  return fn().then((code) => {
    process.stdout.write = origWrite;
    return { code, out: chunks.join('') };
  }).catch((e) => {
    process.stdout.write = origWrite;
    throw e;
  });
}

describe('cli', () => {
  it('list --source cli --json prints an array', async () => {
    const { code, out } = await capture(() => main(['node', 'cli', 'list', '--source', 'cli', '--json']));
    expect(code).toBe(0);
    const parsed = JSON.parse(out);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it('doctor exits 1 when workspace missing', async () => {
    rmSync(path.join(root, 'Library'), { recursive: true, force: true });
    const { code } = await capture(() => main(['node', 'cli', 'doctor']));
    expect(code).toBe(1);
  });

  it('exits 0 when called with no subcommand (help display)', async () => {
    const { code } = await capture(() => main(['node', 'cli']));
    expect(code).toBe(0);
  });

  it('exits 1 when link fails (session not found)', async () => {
    const { code } = await capture(() => main(['node', 'cli', 'link', 'deadbeef-dead-4bee-aaaa-aaaaaaaaaaaa']));
    expect(code).toBe(1);
  });
});

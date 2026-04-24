import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runDoctor } from '../../src/commands/doctor.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'cc-bridge-dr-'));
  process.env.CC_BRIDGE_TEST_ROOT = root;
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  delete process.env.CC_BRIDGE_TEST_ROOT;
});

describe('runDoctor', () => {
  it('reports CLI projects missing when no dir exists', async () => {
    const r = await runDoctor();
    expect(r.ok).toBe(false);
    expect(r.problems.some((p) => p.includes('CLI projects directory'))).toBe(true);
  });

  it('reports Desktop sessions missing when no workspace exists', async () => {
    mkdirSync(path.join(root, '.claude/projects'), { recursive: true });
    const r = await runDoctor();
    expect(r.problems.some((p) => p.includes('Desktop workspace'))).toBe(true);
  });

  it('reports ok when both exist with a workspace', async () => {
    mkdirSync(path.join(root, '.claude/projects'), { recursive: true });
    const ws = path.join(root, 'Library/Application Support/Claude/claude-code-sessions/a/b');
    mkdirSync(ws, { recursive: true });
    writeFileSync(path.join(ws, 'local_x.json'), '{}');
    const r = await runDoctor();
    // On dev boxes without `claude` on PATH, the "CLI not found" problem may appear.
    // What we care about in this test is that our two directory-presence checks pass.
    expect(r.problems.some((p) => p.includes('CLI projects directory'))).toBe(false);
    expect(r.problems.some((p) => p.includes('Desktop workspace'))).toBe(false);
  });
});

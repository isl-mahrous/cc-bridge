import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pickMostRecentWorkspace } from '../../src/manifest/workspace.js';

let root: string;
let dsRoot: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'cc-bridge-test-'));
  process.env.CC_BRIDGE_TEST_ROOT = root;
  dsRoot = path.join(root, 'Library/Application Support/Claude/claude-code-sessions');
  mkdirSync(dsRoot, { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  delete process.env.CC_BRIDGE_TEST_ROOT;
});

describe('pickMostRecentWorkspace', () => {
  it('returns null when no workspace exists', async () => {
    expect(await pickMostRecentWorkspace()).toBeNull();
  });

  it('returns null when workspaces are empty (no manifests)', async () => {
    mkdirSync(path.join(dsRoot, 'a/b'), { recursive: true });
    expect(await pickMostRecentWorkspace()).toBeNull();
  });

  it('returns the B-dir with the newest manifest mtime', async () => {
    const wsOld = path.join(dsRoot, 'wa/wb1');
    const wsNew = path.join(dsRoot, 'wa/wb2');
    mkdirSync(wsOld, { recursive: true });
    mkdirSync(wsNew, { recursive: true });
    writeFileSync(path.join(wsOld, 'local_1.json'), '{}');
    writeFileSync(path.join(wsNew, 'local_2.json'), '{}');
    utimesSync(path.join(wsOld, 'local_1.json'), 1_700_000_000, 1_700_000_000);
    utimesSync(path.join(wsNew, 'local_2.json'), 1_800_000_000, 1_800_000_000);
    const picked = await pickMostRecentWorkspace();
    expect(picked).toBe(wsNew);
  });
});

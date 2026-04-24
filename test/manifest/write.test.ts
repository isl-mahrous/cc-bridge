import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { writeManifestAtomically } from '../../src/manifest/write.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'cc-bridge-write-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const MANIFEST = {
  sessionId: 'local_x',
  cliSessionId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
  cwd: '/tmp/proj',
  originCwd: '/tmp/proj',
  createdAt: 0,
  lastActivityAt: 0,
  model: 'claude-sonnet-4-6',
  isArchived: false,
  title: 'X',
  permissionMode: 'default',
  enabledMcpTools: {},
  remoteMcpServersConfig: [],
};

describe('writeManifestAtomically', () => {
  it('writes <workspace>/local_<sessionUuid>.json', async () => {
    const p = await writeManifestAtomically({ workspaceDir: dir, manifest: MANIFEST });
    expect(p).toBe(path.join(dir, 'local_x.json'));
    const parsed = JSON.parse(readFileSync(p, 'utf-8'));
    expect(parsed).toEqual(MANIFEST);
  });

  it('leaves no .tmp file behind on success', async () => {
    await writeManifestAtomically({ workspaceDir: dir, manifest: MANIFEST });
    expect(readdirSync(dir).filter((f) => f.endsWith('.tmp'))).toEqual([]);
  });

  it('refuses to overwrite existing files', async () => {
    await writeManifestAtomically({ workspaceDir: dir, manifest: MANIFEST });
    await expect(
      writeManifestAtomically({ workspaceDir: dir, manifest: MANIFEST }),
    ).rejects.toThrow(/already exists/i);
  });
});

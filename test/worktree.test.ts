import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { detectWorktree } from '../src/worktree.js';

let repo: string;
let wtree: string;

beforeAll(() => {
  repo = mkdtempSync(path.join(tmpdir(), 'cc-bridge-repo-'));
  execFileSync('git', ['-C', repo, 'init', '-q', '-b', 'main']);
  execFileSync('git', ['-C', repo, 'commit', '-q', '--allow-empty', '-m', 'init']);
  wtree = mkdtempSync(path.join(tmpdir(), 'cc-bridge-wtree-'));
  rmSync(wtree, { recursive: true, force: true }); // git worktree add needs the path not to exist
  execFileSync('git', ['-C', repo, 'worktree', 'add', '-q', wtree, '-b', 'feature']);
});

afterAll(() => {
  try { execFileSync('git', ['-C', repo, 'worktree', 'remove', '--force', wtree]); } catch {}
  rmSync(repo, { recursive: true, force: true });
  rmSync(wtree, { recursive: true, force: true });
});

describe('detectWorktree', () => {
  it('returns null for a non-git directory', async () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'cc-bridge-nogit-'));
    try { expect(await detectWorktree(tmp)).toBeNull(); }
    finally { rmSync(tmp, { recursive: true, force: true }); }
  });

  it('returns null for the primary checkout', async () => {
    expect(await detectWorktree(repo)).toBeNull();
  });

  it('returns worktree info for a linked worktree', async () => {
    const info = await detectWorktree(wtree);
    expect(info).not.toBeNull();
    expect(info!.worktreePath).toBe(realpathSync(wtree));
    expect(info!.branch).toBe('feature');
    expect(info!.worktreeName).toBe(path.basename(wtree));
  });
});

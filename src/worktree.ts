import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const run = promisify(execFile);

export interface WorktreeInfo {
  readonly worktreePath: string;
  readonly worktreeName: string;
  readonly branch: string;
  readonly sourceBranch: string;
}

export async function detectWorktree(cwd: string): Promise<WorktreeInfo | null> {
  const [gitDir, commonDir] = await Promise.all([
    gitRevParse(cwd, '--git-dir'),
    gitRevParse(cwd, '--git-common-dir'),
  ]);
  if (gitDir === null || commonDir === null) return null;
  // In a normal clone both point at the same dir. In a linked worktree, gitDir
  // points at the worktree's .git/worktrees/<name>/ while commonDir stays at
  // the primary repo's .git.
  const gAbs = path.resolve(cwd, gitDir);
  const cAbs = path.resolve(cwd, commonDir);
  if (gAbs === cAbs) return null;

  const top = await gitRevParse(cwd, '--show-toplevel');
  const branch = await gitRevParse(cwd, '--abbrev-ref=strict', 'HEAD');
  if (!top || !branch) return null;

  let sourceBranch = 'main';
  try {
    const { stdout } = await run('git', ['-C', cwd, 'config', '--get', `branch.${branch}.merge`]);
    const ref = stdout.trim();
    if (ref.startsWith('refs/heads/')) sourceBranch = ref.slice('refs/heads/'.length);
  } catch {
    // fall back to 'main'
  }

  return {
    worktreePath: path.resolve(top),
    worktreeName: path.basename(top),
    branch,
    sourceBranch,
  };
}

async function gitRevParse(cwd: string, ...args: string[]): Promise<string | null> {
  try {
    const { stdout } = await run('git', ['-C', cwd, 'rev-parse', ...args]);
    return stdout.trim();
  } catch {
    return null;
  }
}

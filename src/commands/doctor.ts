import { access, constants } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolvePaths } from '../paths.js';
import { pickMostRecentWorkspace } from '../manifest/workspace.js';

const run = promisify(execFile);

export interface DoctorResult {
  readonly ok: boolean;
  readonly problems: string[];
}

export async function runDoctor(): Promise<DoctorResult> {
  const paths = resolvePaths();
  const problems: string[] = [];
  if (!(await exists(paths.cliProjects))) {
    problems.push(`CLI projects directory not found at ${paths.cliProjects}. Install/run Claude Code CLI first.`);
  }
  const ws = await pickMostRecentWorkspace();
  if (ws === null) {
    problems.push(
      `No Desktop workspace found under ${paths.desktopSessions}. Open Claude Desktop's Code tab at least once and try again.`,
    );
  }
  try {
    await run('which', ['claude']);
  } catch {
    problems.push(
      `'claude' CLI not found on PATH. Install Claude Code CLI and ensure it is in your PATH.`,
    );
  }
  return { ok: problems.length === 0, problems };
}

async function exists(p: string): Promise<boolean> {
  try { await access(p, constants.F_OK); return true; } catch { return false; }
}

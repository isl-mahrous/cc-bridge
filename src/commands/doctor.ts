import { access, constants } from 'node:fs/promises';
import { resolvePaths } from '../paths.js';
import { pickMostRecentWorkspace } from '../manifest/workspace.js';

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
  return { ok: problems.length === 0, problems };
}

async function exists(p: string): Promise<boolean> {
  try { await access(p, constants.F_OK); return true; } catch { return false; }
}

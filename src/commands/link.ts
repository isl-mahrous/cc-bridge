import path from 'node:path';
import { access, constants } from 'node:fs/promises';
import { resolvePaths } from '../paths.js';
import { buildManifest } from '../manifest/build.js';
import { writeManifestAtomically } from '../manifest/write.js';
import { pickMostRecentWorkspace } from '../manifest/workspace.js';
import { loadDesktopManifests } from '../discovery/desktop.js';
import { logAction, manifestsCreatedForCliSession } from '../history-log.js';
import { loadConfig } from '../config.js';

export interface LinkOptions {
  readonly cliSessionId: string;
  readonly title?: string;
  readonly effort?: string;
}

export type LinkStatus = 'linked' | 'already-linked-by-us' | 'already-linked-by-other';

export interface LinkResult {
  readonly status: LinkStatus;
  readonly manifestPath: string;
}

export async function linkSession(opts: LinkOptions): Promise<LinkResult> {
  const paths = resolvePaths();
  const jsonlPath = await locateCliJsonl(opts.cliSessionId);
  if (!jsonlPath) throw new Error(`CLI session ${opts.cliSessionId} not found in ${paths.cliProjects}`);

  const existing = await loadDesktopManifests();
  const match = existing.find((m) => m.manifest.cliSessionId === opts.cliSessionId);
  if (match) {
    const ours = await manifestsCreatedForCliSession(opts.cliSessionId);
    const isOurs = ours.includes(match.manifestPath);
    return {
      status: isOurs ? 'already-linked-by-us' : 'already-linked-by-other',
      manifestPath: match.manifestPath,
    };
  }

  const workspaceDir = await pickMostRecentWorkspace();
  if (!workspaceDir) {
    throw new Error(
      `No Desktop workspace found under ${paths.desktopSessions}. ` +
      `Open Claude Desktop's Code tab at least once and try again.`,
    );
  }

  const cfg = await loadConfig();
  const manifest = await buildManifest({
    cliJsonlPath: jsonlPath,
    titleOverride: opts.title,
    effortDefault: opts.effort ?? cfg.defaultEffort,
    modelDefault: cfg.defaultModel,
  });
  const manifestPath = await writeManifestAtomically({ workspaceDir, manifest });

  await logAction({
    action: 'link',
    cliSessionId: manifest.cliSessionId,
    manifestPath,
    manifestSessionId: manifest.sessionId,
    cwd: manifest.cwd,
  });

  return { status: 'linked', manifestPath };
}

async function locateCliJsonl(cliSessionId: string): Promise<string | null> {
  const paths = resolvePaths();
  const { readdir } = await import('node:fs/promises');
  let projDirs: string[];
  try { projDirs = await readdir(paths.cliProjects); } catch { return null; }
  for (const d of projDirs) {
    const candidate = path.join(paths.cliProjects, d, `${cliSessionId}.jsonl`);
    try {
      await access(candidate, constants.F_OK);
      return candidate;
    } catch { /* keep looking */ }
  }
  return null;
}

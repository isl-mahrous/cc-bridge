import { unlink, access, constants } from 'node:fs/promises';
import { loadDesktopManifests } from '../discovery/desktop.js';
import { logAction, manifestsCreatedForCliSession } from '../history-log.js';

export interface UnlinkOptions {
  readonly cliSessionId: string;
}

export interface UnlinkResult {
  readonly removed: string[];
  readonly skippedForeign: string[];
}

export async function unlinkSession(opts: UnlinkOptions): Promise<UnlinkResult> {
  const ours = new Set(await manifestsCreatedForCliSession(opts.cliSessionId));
  const matching = (await loadDesktopManifests()).filter(
    (m) => m.manifest.cliSessionId === opts.cliSessionId,
  );

  const removed: string[] = [];
  const skippedForeign: string[] = [];
  for (const m of matching) {
    if (!ours.has(m.manifestPath)) { skippedForeign.push(m.manifestPath); continue; }
    try {
      await access(m.manifestPath, constants.F_OK);
      await unlink(m.manifestPath);
      removed.push(m.manifestPath);
      await logAction({ action: 'unlink', cliSessionId: opts.cliSessionId, manifestPath: m.manifestPath });
    } catch (e: unknown) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
  }
  return { removed, skippedForeign };
}

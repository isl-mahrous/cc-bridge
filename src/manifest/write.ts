import { open, rename, access, constants, unlink } from 'node:fs/promises';
import path from 'node:path';
import type { DesktopManifest } from './types.js';

export interface WriteManifestOptions {
  readonly workspaceDir: string;
  readonly manifest: DesktopManifest;
}

export async function writeManifestAtomically(opts: WriteManifestOptions): Promise<string> {
  const finalPath = path.join(opts.workspaceDir, `${opts.manifest.sessionId}.json`);
  try {
    await access(finalPath, constants.F_OK);
    throw new Error(`manifest already exists: ${finalPath}`);
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }
  const tmpPath = `${finalPath}.tmp`;
  const handle = await open(tmpPath, 'w');
  try {
    await handle.writeFile(JSON.stringify(opts.manifest, null, 2) + '\n', 'utf-8');
    await handle.sync();
  } catch (writeErr) {
    await handle.close();
    try { await unlink(tmpPath); } catch { /* best-effort cleanup */ }
    throw writeErr;
  }
  await handle.close();
  await rename(tmpPath, finalPath);
  return finalPath;
}

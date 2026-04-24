import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { resolvePaths } from '../paths.js';

export async function pickMostRecentWorkspace(): Promise<string | null> {
  const paths = resolvePaths();
  let a: string[];
  try { a = await readdir(paths.desktopSessions); }
  catch { return null; }

  let best: { dir: string; mtime: number } | null = null;
  for (const av of a) {
    const aAbs = path.join(paths.desktopSessions, av);
    const aSt = await safe(aAbs);
    if (!aSt?.isDirectory()) continue;
    let bEntries: string[];
    try { bEntries = await readdir(aAbs); } catch { continue; }
    for (const bv of bEntries) {
      const bAbs = path.join(aAbs, bv);
      const bSt = await safe(bAbs);
      if (!bSt?.isDirectory()) continue;
      let files: string[];
      try { files = await readdir(bAbs); } catch { continue; }
      let newest = 0;
      let hasManifest = false;
      for (const f of files) {
        if (!(f.startsWith('local_') && f.endsWith('.json'))) continue;
        hasManifest = true;
        const fSt = await safe(path.join(bAbs, f));
        if (fSt && fSt.mtimeMs > newest) newest = fSt.mtimeMs;
      }
      if (!hasManifest) continue;
      if (!best || newest > best.mtime) best = { dir: bAbs, mtime: newest };
    }
  }
  return best?.dir ?? null;
}

async function safe(p: string) {
  try { return await stat(p); } catch { return null; }
}

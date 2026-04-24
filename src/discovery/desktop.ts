import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { resolvePaths } from '../paths.js';
import { summarize } from '../jsonl.js';
import type { DesktopManifest } from '../manifest/types.js';
import type { SessionSummary } from './types.js';

export interface LoadedManifest {
  readonly manifestPath: string;
  readonly workspaceA: string;
  readonly workspaceB: string;
  readonly manifest: DesktopManifest;
}

export async function loadDesktopManifests(): Promise<LoadedManifest[]> {
  const paths = resolvePaths();
  let aDirs: string[];
  try { aDirs = await readdir(paths.desktopSessions); }
  catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
  const out: LoadedManifest[] = [];
  for (const a of aDirs) {
    const aAbs = path.join(paths.desktopSessions, a);
    const aSt = await safeStat(aAbs);
    if (!aSt?.isDirectory()) continue;
    let bEntries: string[];
    try { bEntries = await readdir(aAbs); } catch { continue; }
    for (const b of bEntries) {
      const bAbs = path.join(aAbs, b);
      const bSt = await safeStat(bAbs);
      if (!bSt?.isDirectory()) continue;
      let fEntries: string[];
      try { fEntries = await readdir(bAbs); } catch { continue; }
      for (const f of fEntries) {
        if (!(f.startsWith('local_') && f.endsWith('.json'))) continue;
        const mAbs = path.join(bAbs, f);
        try {
          const raw = await readFile(mAbs, 'utf-8');
          const manifest = JSON.parse(raw) as DesktopManifest;
          out.push({ manifestPath: mAbs, workspaceA: a, workspaceB: b, manifest });
        } catch {
          // Skip unparsable manifests silently; discovery must not crash.
        }
      }
    }
  }
  return out;
}

async function safeStat(p: string) {
  try { return await stat(p); } catch { return null; }
}

export interface DiscoverDesktopOptions {
  readonly cwd?: string;
}

export async function discoverDesktopSessions(
  opts: DiscoverDesktopOptions = {},
): Promise<SessionSummary[]> {
  const paths = resolvePaths();
  const loaded = await loadDesktopManifests();
  const rows: SessionSummary[] = [];
  for (const { manifest, manifestPath } of loaded) {
    if (opts.cwd && manifest.cwd !== opts.cwd) continue;
    const jsonlPath = path.join(
      paths.cliProjects,
      encodeCwd(manifest.cwd),
      `${manifest.cliSessionId}.jsonl`,
    );
    let eventCount = 0;
    let startedAt: number | null = manifest.createdAt;
    let lastActivityAt: number | null = manifest.lastActivityAt;
    let model: string | null = manifest.model;
    try {
      const s = await summarize(jsonlPath);
      eventCount = s.eventCount;
      if (s.firstTimestampMs !== null) startedAt = s.firstTimestampMs;
      if (s.lastTimestampMs !== null) lastActivityAt = s.lastTimestampMs;
      if (s.model) model = s.model;
    } catch {
      // Manifest points at a missing JSONL — still surface it, but note zero events.
    }
    rows.push({
      surface: 'desktop',
      sessionId: manifest.sessionId,
      cliSessionId: manifest.cliSessionId,
      cwd: manifest.cwd,
      jsonlPath,
      startedAt,
      lastActivityAt,
      title: manifest.title,
      model,
      eventCount,
      hasBridgeManifest: true,
      manifestPath,
    });
  }
  return rows;
}

// Inverse of the CLI's encoding convention: `/` and `.` become `-`, no escape.
// Lossy, but matches the CLI's own write behavior.
export function encodeCwd(cwd: string): string {
  return cwd.replace(/[./]/g, '-');
}

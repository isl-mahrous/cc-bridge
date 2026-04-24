import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { resolvePaths } from '../paths.js';
import { summarize, extractTitle } from '../jsonl.js';
import type { SessionSummary } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface DiscoverCliOptions {
  readonly cwd?: string; // filter by decoded cwd
}

export async function discoverCliSessions(opts: DiscoverCliOptions = {}): Promise<SessionSummary[]> {
  const paths = resolvePaths();
  const rows: SessionSummary[] = [];
  let projectDirs: string[];
  try {
    projectDirs = await readdir(paths.cliProjects);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
  for (const proj of projectDirs) {
    const projAbs = path.join(paths.cliProjects, proj);
    let st;
    try { st = await stat(projAbs); } catch { continue; }
    if (!st.isDirectory()) continue;
    let entries: string[];
    try { entries = await readdir(projAbs); } catch { continue; }
    for (const entry of entries) {
      if (!entry.endsWith('.jsonl')) continue;
      const stem = entry.slice(0, -'.jsonl'.length);
      if (!UUID_RE.test(stem)) continue;
      const abs = path.join(projAbs, entry);
      const [sum, title] = await Promise.all([summarize(abs), extractTitle(abs)]);
      const cwd = sum.cwd ?? decodeProjectDir(proj);
      if (opts.cwd && cwd !== opts.cwd) continue;
      rows.push({
        surface: 'cli',
        sessionId: stem,
        cliSessionId: stem,
        cwd,
        jsonlPath: abs,
        startedAt: sum.firstTimestampMs,
        lastActivityAt: sum.lastTimestampMs,
        title: title ?? '(untitled)',
        model: sum.model,
        eventCount: sum.eventCount,
        hasBridgeManifest: false,
      });
    }
  }
  return rows;
}

// Lossy fallback only — callers should prefer the `cwd` from JSONL events.
function decodeProjectDir(encoded: string): string {
  // The CLI replaces both `/` and `.` with `-`. We can't perfectly invert that,
  // so return the best guess as an absolute path with `/` substitutions.
  return '/' + encoded.replace(/^-/, '').replace(/-/g, '/');
}

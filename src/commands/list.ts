import { discoverCliSessions, withDesktopStatus } from '../discovery/cli.js';
import { discoverDesktopSessions } from '../discovery/desktop.js';
import type { SessionSummary } from '../discovery/types.js';

export type ListSource = 'all' | 'cli' | 'desktop';

export interface ListOptions {
  readonly source: ListSource;
  readonly cwd?: string;
}

export async function listSessions(opts: ListOptions): Promise<SessionSummary[]> {
  const rows: SessionSummary[] = [];
  if (opts.source === 'cli' || opts.source === 'all') {
    const cli = await discoverCliSessions({ cwd: opts.cwd });
    rows.push(...(await withDesktopStatus(cli)));
  }
  if (opts.source === 'desktop' || opts.source === 'all') {
    rows.push(...(await discoverDesktopSessions({ cwd: opts.cwd })));
  }
  rows.sort((a, b) => (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0));
  return rows;
}

import { v4 as uuidv4 } from 'uuid';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { summarize, extractTitle } from '../jsonl.js';
import { detectWorktree } from '../worktree.js';
import type { DesktopManifest } from './types.js';

export interface BuildManifestOptions {
  readonly cliJsonlPath: string;
  readonly titleOverride?: string;
  readonly effortDefault?: string;
  readonly modelDefault?: string;
}

export async function buildManifest(opts: BuildManifestOptions): Promise<DesktopManifest> {
  const { cliJsonlPath } = opts;
  const uuid = path.basename(cliJsonlPath, '.jsonl');
  const [sum, extracted, st] = await Promise.all([
    summarize(cliJsonlPath),
    extractTitle(cliJsonlPath),
    stat(cliJsonlPath),
  ]);

  const cwd = sum.cwd;
  if (!cwd) {
    throw new Error(
      `cannot build manifest for ${cliJsonlPath}: no cwd found in JSONL events`,
    );
  }

  const createdAt = sum.firstTimestampMs ?? Math.floor(st.mtimeMs);
  const lastActivityAt = sum.lastTimestampMs ?? Math.floor(st.mtimeMs);
  const model = sum.model ?? opts.modelDefault ?? 'claude-sonnet-4-6';
  const title = opts.titleOverride ?? extracted ?? '(untitled session)';
  const permissionMode = sum.permissionMode ?? 'default';

  const manifest: DesktopManifest = {
    sessionId: `local_${uuidv4()}`,
    cliSessionId: uuid,
    cwd,
    originCwd: cwd,
    createdAt,
    lastActivityAt,
    model,
    isArchived: false,
    title,
    permissionMode,
    enabledMcpTools: {},
    remoteMcpServersConfig: [],
  };

  if (opts.effortDefault) manifest.effort = opts.effortDefault;

  const wt = await detectWorktree(cwd);
  if (wt) {
    manifest.worktreePath = wt.worktreePath;
    manifest.worktreeName = wt.worktreeName;
    manifest.branch = wt.branch;
    manifest.sourceBranch = wt.sourceBranch;
  }

  return manifest;
}

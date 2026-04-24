import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { resolvePaths } from './paths.js';

export type ActionType = 'link' | 'unlink' | 'open';

interface BaseRecord {
  ts: string;
  action: ActionType;
}

export interface LinkRecord extends BaseRecord {
  action: 'link';
  cliSessionId: string;
  manifestPath: string;
  manifestSessionId: string;
  cwd: string;
}

export interface UnlinkRecord extends BaseRecord {
  action: 'unlink';
  cliSessionId: string;
  manifestPath: string;
}

export interface OpenRecord extends BaseRecord {
  action: 'open';
  cliSessionId: string;
  cwd: string;
}

export type HistoryRecord = LinkRecord | UnlinkRecord | OpenRecord;

export async function logAction(rec: Omit<LinkRecord, 'ts'> | Omit<UnlinkRecord, 'ts'> | Omit<OpenRecord, 'ts'>): Promise<void> {
  const paths = resolvePaths();
  await mkdir(paths.bridgeHome, { recursive: true });
  const full = { ts: new Date().toISOString(), ...rec } as HistoryRecord;
  await appendFile(paths.historyLog, JSON.stringify(full) + '\n', 'utf-8');
}

export async function readHistory(): Promise<HistoryRecord[]> {
  const paths = resolvePaths();
  let raw: string;
  try { raw = await readFile(paths.historyLog, 'utf-8'); }
  catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
  return raw.split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l) as HistoryRecord);
}

export async function manifestsCreatedForCliSession(cliSessionId: string): Promise<string[]> {
  const hist = await readHistory();
  const linked = new Set<string>();
  for (const r of hist) {
    if (r.action === 'link' && r.cliSessionId === cliSessionId) linked.add(r.manifestPath);
    else if (r.action === 'unlink' && r.cliSessionId === cliSessionId) linked.delete(r.manifestPath);
  }
  return [...linked];
}

export function ensurePathMatches(recorded: string, actual: string): boolean {
  return path.resolve(recorded) === path.resolve(actual);
}

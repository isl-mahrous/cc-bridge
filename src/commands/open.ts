import { spawn, type SpawnOptions } from 'node:child_process';
import { access, constants } from 'node:fs/promises';
import { discoverCliSessions } from '../discovery/cli.js';
import { logAction } from '../history-log.js';

export interface OpenInvocation {
  readonly command: 'claude';
  readonly args: readonly string[];
  readonly cwd: string;
}

export interface BuildOpenOptions {
  readonly cliSessionId: string;
}

export async function buildOpenInvocation(opts: BuildOpenOptions): Promise<OpenInvocation> {
  const rows = await discoverCliSessions();
  const row = rows.find((r) => r.cliSessionId === opts.cliSessionId);
  if (!row) throw new Error(`CLI session not found: ${opts.cliSessionId}`);
  try { await access(row.cwd, constants.F_OK); }
  catch { throw new Error(`original cwd ${row.cwd} is missing; cd there manually and run 'claude --resume ${opts.cliSessionId}'.`); }
  return { command: 'claude', args: ['--resume', opts.cliSessionId], cwd: row.cwd };
}

export async function openSession(opts: BuildOpenOptions): Promise<number> {
  const inv = await buildOpenInvocation(opts);
  const spawnOpts: SpawnOptions = { cwd: inv.cwd, stdio: 'inherit' };
  return await new Promise<number>((resolve, reject) => {
    const child = spawn(inv.command, [...inv.args], spawnOpts);
    let spawned = false;
    child.on('spawn', () => { spawned = true; });
    child.on('error', reject);
    child.on('exit', async (code) => {
      if (spawned) {
        await logAction({ action: 'open', cliSessionId: opts.cliSessionId, cwd: inv.cwd });
      }
      resolve(code ?? 0);
    });
  });
}

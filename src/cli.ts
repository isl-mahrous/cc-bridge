// src/cli.ts
import { Command } from 'commander';
import { listSessions, type ListSource } from './commands/list.js';
import { runDoctor } from './commands/doctor.js';
import { linkSession } from './commands/link.js';
import { unlinkSession } from './commands/unlink.js';
import { openSession } from './commands/open.js';
import { tailHistory } from './commands/history.js';
import type { SessionSummary } from './discovery/types.js';

export async function main(argv: readonly string[]): Promise<number> {
  const program = new Command();
  program
    .name('cc-bridge')
    .description('Bridge Claude Code sessions between the CLI and the Claude Desktop app.')
    .exitOverride();

  let exitCode = 0;

  program
    .command('list')
    .description('List Claude Code sessions from both surfaces')
    .option('--source <source>', 'cli | desktop | all', 'all')
    .option('--cwd <path>', 'filter by project cwd')
    .option('--json', 'output JSON instead of a table', false)
    .action(async (opts: { source: string; cwd?: string; json: boolean }) => {
      if (!['all', 'cli', 'desktop'].includes(opts.source)) {
        process.stderr.write(`invalid source: ${opts.source}\n`);
        exitCode = 1; return;
      }
      const rows = await listSessions({ source: opts.source as ListSource, cwd: opts.cwd });
      if (opts.json) {
        process.stdout.write(JSON.stringify(rows, null, 2));
      } else {
        process.stdout.write(formatTable(rows));
      }
    });

  program
    .command('open <cliSessionId>')
    .description("Resume a session in the CLI via 'claude --resume'")
    .action(async (id: string) => {
      exitCode = await openSession({ cliSessionId: id });
    });

  program
    .command('link <cliSessionId>')
    .description('Create a Desktop manifest so a CLI session appears in the Desktop Code tab')
    .option('--title <title>', 'override the auto-extracted title')
    .option('--effort <effort>', 'default effort (high, medium, ...)')
    .action(async (id: string, opts: { title?: string; effort?: string }) => {
      const r = await linkSession({ cliSessionId: id, title: opts.title, effort: opts.effort });
      if (r.status === 'linked') process.stdout.write(`linked: ${r.manifestPath}\n`);
      else if (r.status === 'already-linked-by-us') process.stdout.write(`already linked (by us): ${r.manifestPath}\n`);
      else process.stdout.write(`already linked (not by us): ${r.manifestPath}\n(refusing to duplicate; use 'unlink' first if you really want to replace.)\n`);
    });

  program
    .command('unlink <cliSessionId>')
    .description("Remove Desktop manifests that cc-bridge created for this session")
    .action(async (id: string) => {
      const r = await unlinkSession({ cliSessionId: id });
      for (const p of r.removed) process.stdout.write(`removed: ${p}\n`);
      for (const p of r.skippedForeign) process.stdout.write(`skipped (foreign): ${p}\n`);
      if (r.removed.length === 0 && r.skippedForeign.length === 0) process.stdout.write('nothing to unlink\n');
    });

  program
    .command('history')
    .description('Print the most recent cc-bridge actions')
    .option('--limit <n>', 'how many entries to show', '20')
    .action(async (opts: { limit: string }) => {
      const records = await tailHistory({ limit: Number(opts.limit) || 20 });
      for (const r of records) process.stdout.write(JSON.stringify(r) + '\n');
    });

  program
    .command('doctor')
    .description('Check environment prerequisites')
    .action(async () => {
      const r = await runDoctor();
      if (r.ok) process.stdout.write('ok\n');
      else {
        for (const p of r.problems) process.stdout.write(`- ${p}\n`);
        exitCode = 1;
      }
    });

  try {
    await program.parseAsync([...argv]);
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === 'commander.helpDisplayed' || err.code === 'commander.version') return 0;
    process.stderr.write(`${err.message ?? String(e)}\n`);
    return 2;
  }
  return exitCode;
}

function formatTable(rows: readonly SessionSummary[]): string {
  if (rows.length === 0) return '(no sessions)\n';
  const lines: string[] = [];
  lines.push(pad('SURFACE', 8) + pad('ID', 40) + pad('LAST ACTIVITY', 22) + pad('MODEL', 22) + 'TITLE');
  for (const r of rows) {
    const last = r.lastActivityAt ? new Date(r.lastActivityAt).toISOString().slice(0, 19).replace('T', ' ') : '(none)';
    lines.push(
      pad(r.surface, 8) +
      pad(r.cliSessionId.slice(0, 8) + (r.hasBridgeManifest ? ' *' : ''), 40) +
      pad(last, 22) +
      pad(r.model ?? '-', 22) +
      r.title,
    );
  }
  lines.push('(* = linked to Desktop)');
  return lines.join('\n') + '\n';
}

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n - 1) + ' ' : s + ' '.repeat(n - s.length);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv).then((c) => process.exit(c));
}

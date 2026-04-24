# cc-bridge

Bridge Claude Code sessions between the CLI (`claude --resume`) and the Claude Desktop app's Code tab. macOS only (for now).

## How it works

Both surfaces already share the same underlying JSONL storage at `~/.claude/projects/`. Desktop additionally keeps a small metadata manifest per session under `~/Library/Application Support/Claude/claude-code-sessions/`. `cc-bridge` provides:

- **Desktop → CLI:** pick any Desktop session, exec `claude --resume <id>` in the right `cwd`.
- **CLI → Desktop:** pick a CLI session, write a new Desktop manifest pointing at the shared JSONL. Session appears in Desktop's Code tab.

No conversation data is copied, translated, or cached. All writes are atomic and additive; `unlink` only removes manifests cc-bridge itself created.

## Install

```bash
npm install -g cc-bridge
```

Node 20+ required.

## Usage

Interactive TUI:

```bash
cc-bridge
```

Non-interactive:

```bash
cc-bridge list                             # all sessions, both surfaces
cc-bridge list --source cli --json         # JSON, CLI only
cc-bridge open <cli-session-id>            # resume in the CLI
cc-bridge link <cli-session-id>            # expose in Desktop
cc-bridge unlink <cli-session-id>          # remove the exposure
cc-bridge history                          # audit log of cc-bridge actions
cc-bridge doctor                           # sanity-check environment
```

If `doctor` reports a missing Desktop workspace, open Claude Desktop's Code tab once, then retry.

## Safety

- Read-only on `~/.claude/projects/`.
- Additive writes only on `~/Library/Application Support/Claude/claude-code-sessions/`, all atomic (`tmp + fsync + rename`).
- `unlink` only removes manifests cc-bridge created (tracked via `~/.cc-bridge/history.log`); foreign manifests are never touched.

## Development

```bash
npm install
npm test            # run the full vitest suite
npm run typecheck
npm run build       # emits dist/cli.js
```

Tests use `CC_BRIDGE_TEST_ROOT` to redirect all filesystem access into a tmp dir, so they never touch the real `~/.claude/` or Desktop data.

## License

MIT

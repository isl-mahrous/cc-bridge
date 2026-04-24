<div align="center">

# cc-bridge

**Bridge your Claude Code sessions between the CLI and the Claude Desktop app.**

*Start a conversation in one, continue it in the other — without copying a byte.*

[![Node](https://img.shields.io/badge/node-%E2%89%A520-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![macOS](https://img.shields.io/badge/platform-macOS-000000?logo=apple&logoColor=white)](#platform-support)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](#license)
[![Status](https://img.shields.io/badge/status-alpha-orange.svg)](#status)

</div>

---

## Why

Claude Code runs in two places: the **CLI** (`claude` in your terminal) and the **Desktop app's Code tab**. Today they each show their own session sidebar, with no way to hop from one to the other. You start a conversation in Desktop and it's invisible from the CLI; you start it in the CLI and it never appears in Desktop.

`cc-bridge` fixes that.

The trick: both surfaces already write their conversations to the **same place** on disk (`~/.claude/projects/<cwd>/<uuid>.jsonl`). Desktop additionally keeps a small metadata manifest that tells its sidebar which sessions to display. `cc-bridge` just closes the loop — it surfaces each side's sessions to the other, creating/removing those manifests when you ask.

**No conversation data is copied, translated, or cached.** Both surfaces continue to read and append to the same JSONL file. The "bridge" is purely about discoverability.

## Demo

```
$ cc-bridge
┌─ Source ───────────────────────────────────────────┐
│ › Claude Code CLI     (sessions: 117)              │
│   Claude Desktop Code (sessions:   7)              │
└────────────────────────────────────────────────────┘
                         ↓
┌─ Project ──────────────────────────────────────────┐
│ › /Users/islam/Coding/Snoonu           (28)        │
│   /Users/islam/Coding/Personal/Sedra    (9)        │
│   /Users/islam                          (3)        │
│   [ all projects ]                                 │
└────────────────────────────────────────────────────┘
                         ↓
┌─ Sessions ─────────────────────────────────────────┐
│ / search:  ad                                      │
│ lnk  id        last-activity       title           │
│      ab922531  2026-03-25 23:17    Please analyze… │
│  •   7bc8cfa0  2026-04-10 14:22    Menu sync op…   │
│      a016a936  2026-04-24 14:24    Base directory… │
└────────────────────────────────────────────────────┘
                         ↓
┌─ Action ───────────────────────────────────────────┐
│ › Open in CLI      exec `claude --resume <id>`     │
│   Link to Desktop  write manifest, show in sidebar │
│   Unlink           remove the manifest             │
└────────────────────────────────────────────────────┘
```

## Install

Until published to npm:

```bash
git clone git@github.com:isl-mahrous/cc-bridge.git
cd cc-bridge
npm install
npm run build
npm link
```

Verify:

```bash
cc-bridge doctor        # should print "ok"
cc-bridge --help
```

If `doctor` complains about a missing Desktop workspace, open Claude Desktop → Code tab once, then retry.

## Usage

### Interactive

```bash
cc-bridge
```

Walk the wizard: **Source → Project → Session → Action**. Keys: `↑/↓` navigate, `Enter` select, `/` search (in the session step), `Esc` / `←` go back, `q` quit.

### Non-interactive

```bash
cc-bridge list                                 # all sessions, both surfaces
cc-bridge list --source cli --json             # JSON for scripting
cc-bridge list --cwd /path/to/project          # filter by project

cc-bridge open <cli-session-id>                # resume in the terminal
cc-bridge link <cli-session-id>                # expose in Desktop's Code tab
cc-bridge link <cli-session-id> --title "…"    # override auto-title
cc-bridge unlink <cli-session-id>              # remove the exposure

cc-bridge history                              # audit log of cc-bridge actions
cc-bridge doctor                               # environment check
```

Exit codes: `0` success · `1` expected failure (with message) · `2` unexpected.

### Typical workflows

| You want to… | Run |
|---|---|
| Continue a Desktop session in the terminal | `cc-bridge list --source desktop` → grab id → `cc-bridge open <id>` |
| See a CLI session in Desktop's sidebar | `cc-bridge link <id>`, then relaunch Desktop if it doesn't appear |
| Review what you've linked | `cc-bridge list --source cli` (rows marked `*` are linked) |
| Clean up | `cc-bridge history` to review, `cc-bridge unlink <id>` to remove |

## Under the hood

```
                    ┌──────────────────────────────────────┐
                    │  ~/.claude/projects/<cwd>/<id>.jsonl  │  ← shared storage
                    └───────────────┬──────────────────────┘
                                    │
        reads / appends             │             reads / appends
    ┌───────────────────────┐       │       ┌──────────────────────────────┐
    │ Claude CLI (`claude`) │───────┼───────│ Claude Desktop "Code" tab    │
    └───────────┬───────────┘       │       └──────────────┬───────────────┘
                │                   │                      │
         lists from                 │              manifests tell sidebar
         its own scan               │              which sessions to show
                │                   │                      │
                │                   │       ┌──────────────▼───────────────┐
                │                   │       │ ~/Library/.../               │
                │                   │       │ claude-code-sessions/<A>/<B>/│
                │                   │       │ local_*.json                 │
                │                   │       └──────────────┬───────────────┘
                │                   │                      │
                │         ┌─────────▼─────────┐            │
                └─────────┤    cc-bridge      ├────────────┘
                          │                   │
                          │ creates/removes   │
                          │ these manifests   │
                          └───────────────────┘
```

- **Desktop → CLI** is instantaneous: `cc-bridge open <id>` just exec's `claude --resume <id>` in the session's original `cwd`.
- **CLI → Desktop** writes a new manifest (JSON, ~500 bytes) pointing at the existing JSONL. Desktop's sidebar picks it up on next launch.
- **Re-sync is not a problem** — both surfaces are looking at the same file. If one appends turns, the other sees them next time it opens the session.

## Safety

| Invariant | How it's enforced |
|---|---|
| Never writes to `~/.claude/projects/` | No code path ever opens a file there for writing. `list` / `open` only read. |
| Additive-only on Desktop's manifest dir | Only `writeManifestAtomically` writes, and only to a fresh UUID. |
| Atomic writes | `tmp + fsync + rename` — Desktop can never observe a half-written file. |
| `unlink` never touches foreign manifests | Only removes manifests whose creation is recorded in `~/.cc-bridge/history.log`. |
| Idempotent `link` | Detects and reports whether a session is already linked (by cc-bridge or by Desktop itself). |
| Offline | No network access anywhere in the tool. |

## Platform support

| Platform | Status |
|---|---|
| macOS | ✅ Supported and tested against Claude Desktop v2.1.111 |
| Windows | ⏳ Paths are analogous but unverified |
| Linux | ❌ Claude Desktop isn't available |

Only `src/paths.ts` would need to change to add Windows support. PRs welcome.

## Configuration

Optional file at `~/.cc-bridge/config.json`:

```json
{
  "defaultModel": "claude-opus-4-7",
  "defaultEffort": "high"
}
```

Used only when `cc-bridge link` has to populate a manifest with no explicit flags.

## Development

```bash
npm install
npm test            # full vitest suite (59 tests at v0.1.0)
npm run typecheck   # strict TypeScript
npm run build       # emits dist/cli.js
```

Tests redirect all filesystem access through the `CC_BRIDGE_TEST_ROOT` env var, so they never touch your real `~/.claude/` or Desktop data.

```
src/
├── paths.ts              # path resolver with CC_BRIDGE_TEST_ROOT override
├── jsonl.ts              # streaming JSONL reader + title extraction
├── worktree.ts           # git worktree detection
├── config.ts             # ~/.cc-bridge/config.json
├── history-log.ts        # append-only audit log
├── discovery/
│   ├── cli.ts            # scan ~/.claude/projects/
│   └── desktop.ts        # scan Desktop's manifest tree
├── manifest/
│   ├── build.ts          # JSONL → manifest dict
│   ├── write.ts          # atomic writer
│   └── workspace.ts      # pick the most-recent Desktop workspace
├── commands/             # doctor · list · link · unlink · open · history
├── tui/                  # Ink: SourceStep · ProjectStep · SessionStep · ActionStep
└── cli.ts                # commander wiring + TUI handoff
```

## Gotchas

- **Relaunch Desktop after `link`** — it caches the sidebar at startup. You'll see the new session after quit-and-reopen.
- **Desktop sometimes re-creates a manifest** after you `unlink` (it seems to mirror any session it has ever opened). Harmless; `unlink` again.
- **If a CLI session's original cwd was deleted**, `open` refuses with a message telling you to `cd` somewhere manually and run `claude --resume <id>` yourself.
- **`claude --teleport`** (Anthropic's built-in cloud→CLI handoff) is unrelated to `cc-bridge` — different problem, different mechanism. The two don't interact.

## Status

`v0.1.0` — alpha. Works end-to-end on macOS with Claude Desktop v2.1.111. Expect breakage if Claude Desktop's on-disk format changes in a future release; please open an issue if you hit it.

## Acknowledgments

Built using [Ink](https://github.com/vadimdemedes/ink), [commander](https://github.com/tj/commander.js), [vitest](https://vitest.dev/), and [tsup](https://tsup.egoist.dev/). Design was iterated with [Claude Code](https://docs.anthropic.com/en/docs/claude-code) itself, which is how the shared-storage insight was discovered in the first place.

## License

MIT

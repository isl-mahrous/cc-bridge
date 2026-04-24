export interface DesktopManifest {
  sessionId: string;              // "local_<uuid>"
  cliSessionId: string;           // points at a .jsonl in ~/.claude/projects
  cwd: string;
  originCwd: string;
  createdAt: number;              // Unix ms
  lastActivityAt: number;
  model: string;
  isArchived: boolean;
  title: string;
  permissionMode: string;
  enabledMcpTools: Record<string, boolean>;
  remoteMcpServersConfig: unknown[];
  effort?: string;
  completedTurns?: number;
  chromePermissionMode?: string;
  worktreePath?: string;
  worktreeName?: string;
  sourceBranch?: string;
  branch?: string;
}

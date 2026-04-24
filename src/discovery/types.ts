export type Surface = 'cli' | 'desktop';

export interface SessionSummary {
  readonly surface: Surface;
  readonly sessionId: string;         // CLI uuid OR Desktop local_<uuid>
  readonly cliSessionId: string;      // Always populated — the JSONL uuid
  readonly cwd: string;
  readonly jsonlPath: string;         // Absolute path to backing JSONL
  readonly startedAt: number | null;  // Unix ms
  readonly lastActivityAt: number | null;
  readonly title: string;
  readonly model: string | null;
  readonly eventCount: number;
  readonly hasBridgeManifest: boolean; // True only for CLI rows when a Desktop manifest points at them
  readonly manifestPath?: string;      // Set when surface === 'desktop' OR hasBridgeManifest is true
}

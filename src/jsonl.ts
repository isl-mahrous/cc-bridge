import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

export interface JsonlEvent {
  type?: string;
  timestamp?: string;
  cwd?: string;
  model?: string;
  permissionMode?: string;
  message?: {
    role?: string;
    content?: string | Array<{ type: string; text?: string; [k: string]: unknown }>;
  };
  [k: string]: unknown;
}

export async function* readJsonlEvents(filePath: string): AsyncGenerator<JsonlEvent> {
  const stream = createReadStream(filePath, { encoding: 'utf-8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        yield JSON.parse(trimmed) as JsonlEvent;
      } catch {
        // skip invalid JSON silently; fixture corruption shouldn't crash discovery
      }
    }
  } finally {
    rl.close();
    stream.destroy();
  }
}

export interface JsonlSummary {
  readonly firstTimestampMs: number | null;
  readonly lastTimestampMs: number | null;
  readonly cwd: string | null;
  readonly model: string | null;
  readonly permissionMode: string | null;
  readonly eventCount: number;
}

export async function summarize(filePath: string): Promise<JsonlSummary> {
  let first: number | null = null;
  let last: number | null = null;
  let cwd: string | null = null;
  let model: string | null = null;
  let permissionMode: string | null = null;
  let count = 0;
  for await (const ev of readJsonlEvents(filePath)) {
    count++;
    if (typeof ev.timestamp === 'string') {
      const t = Date.parse(ev.timestamp);
      if (!Number.isNaN(t)) {
        if (first === null) first = t;
        last = t;
      }
    }
    if (cwd === null && typeof ev.cwd === 'string') cwd = ev.cwd;
    if (typeof ev.model === 'string') model = ev.model;
    if (typeof ev.permissionMode === 'string') permissionMode = ev.permissionMode;
  }
  return { firstTimestampMs: first, lastTimestampMs: last, cwd, model, permissionMode, eventCount: count };
}

export interface ExtractTitleOptions {
  readonly maxLen?: number;
}

const WRAPPER_MARKERS = ['<local-command-caveat>', '<command-name>', '<command-message>'];

export async function extractTitle(
  filePath: string,
  opts: ExtractTitleOptions = {},
): Promise<string | null> {
  const maxLen = opts.maxLen ?? 60;
  for await (const ev of readJsonlEvents(filePath)) {
    const role = ev.message?.role ?? ev.type;
    if (role !== 'user') continue;
    const content = ev.message?.content;
    let text: string | null = null;
    if (typeof content === 'string') text = content;
    else if (Array.isArray(content)) {
      for (const block of content) {
        if (block?.type === 'text' && typeof block.text === 'string') {
          text = block.text;
          break;
        }
      }
    }
    if (!text) continue;
    const t = text.trim();
    if (!t) continue;
    if (t.startsWith('<') || t.startsWith('/')) continue;
    if (WRAPPER_MARKERS.some((m) => t.includes(m))) continue;
    const firstLine = t.split(/\r?\n/)[0] ?? t;
    return firstLine.slice(0, maxLen);
  }
  return null;
}

import { describe, it, expect } from 'vitest';
import { readJsonlEvents, summarize, extractTitle } from '../src/jsonl.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(
  here,
  'fixtures/projects/-tmp-proj/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa.jsonl',
);

describe('readJsonlEvents', () => {
  it('yields one event per line, skipping blanks and invalid JSON', async () => {
    const evs = [];
    for await (const e of readJsonlEvents(fixture)) evs.push(e);
    expect(evs.length).toBe(4);
    expect(evs[0]!.type).toBe('permission-mode');
    expect(evs[1]!.type).toBe('user');
  });
});

describe('summarize', () => {
  it('returns first/last timestamp, cwd, model, counts', async () => {
    const s = await summarize(fixture);
    expect(s.firstTimestampMs).toBe(new Date('2026-04-20T10:00:00.000Z').getTime());
    expect(s.lastTimestampMs).toBe(new Date('2026-04-20T10:00:10.000Z').getTime());
    expect(s.cwd).toBe('/tmp/proj');
    expect(s.model).toBe('claude-sonnet-4-6');
    expect(s.eventCount).toBe(4);
  });
});

describe('extractTitle', () => {
  it('uses the first user text that is not a slash/XML wrapper', async () => {
    const t = await extractTitle(fixture);
    expect(t).toBe('Hello world');
  });

  it('returns null when no clean prompt exists', async () => {
    const t = await extractTitle(fixture, { maxLen: 5 });
    expect(t).toBe('Hello');
  });
});

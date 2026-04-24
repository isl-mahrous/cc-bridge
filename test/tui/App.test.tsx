import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { App } from '../../src/tui/App.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'cc-bridge-tui-'));
  process.env.CC_BRIDGE_TEST_ROOT = root;
  const proj = path.join(root, '.claude/projects/-tmp-proj');
  mkdirSync(proj, { recursive: true });
  writeFileSync(path.join(proj, 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa.jsonl'),
    JSON.stringify({ type: 'user', timestamp: '2026-04-20T10:00:00.000Z', cwd: '/tmp/proj', message: { role: 'user', content: 'Hi' } }) + '\n');
  const ws = path.join(root, 'Library/Application Support/Claude/claude-code-sessions/a/b');
  mkdirSync(ws, { recursive: true });
  writeFileSync(path.join(ws, 'local_seed.json'), '{}');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  delete process.env.CC_BRIDGE_TEST_ROOT;
});

describe('App', () => {
  it('renders the source-step first', () => {
    const { lastFrame } = render(<App />);
    expect(lastFrame()).toContain('Source');
    expect(lastFrame()).toContain('Claude Code CLI');
    expect(lastFrame()).toContain('Claude Desktop Code');
  });
});

describe('App → ProjectStep', () => {
  it('moves to ProjectStep after selecting CLI source', async () => {
    const { lastFrame, stdin } = render(<App />);
    await new Promise((r) => setTimeout(r, 20)); // let initial useInput listeners attach
    stdin.write('\r'); // Enter on CLI
    await new Promise((r) => setTimeout(r, 50));
    expect(lastFrame()).toContain('Project');
    expect(lastFrame()).toContain('/tmp/proj');
  });
});

describe('App → SessionStep', () => {
  it('shows the session row after picking CLI → project', async () => {
    const { lastFrame, stdin } = render(<App />);
    await new Promise((r) => setTimeout(r, 20));
    stdin.write('\r'); // source: CLI
    await new Promise((r) => setTimeout(r, 100));
    stdin.write('\r'); // project: /tmp/proj
    await new Promise((r) => setTimeout(r, 100));
    expect(lastFrame()).toContain('Sessions');
    expect(lastFrame()).toContain('aaaaaaaa');
    expect(lastFrame()).toMatch(/Hi/);
  });
});

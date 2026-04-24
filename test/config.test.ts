import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadConfig } from '../src/config.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'cc-bridge-cfg-'));
  process.env.CC_BRIDGE_TEST_ROOT = root;
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  delete process.env.CC_BRIDGE_TEST_ROOT;
});

describe('loadConfig', () => {
  it('returns built-in defaults when no config file exists', async () => {
    const cfg = await loadConfig();
    expect(cfg.defaultModel).toBe('claude-sonnet-4-6');
    expect(cfg.defaultEffort).toBeUndefined();
  });

  it('merges user config over defaults', async () => {
    mkdirSync(path.join(root, '.cc-bridge'), { recursive: true });
    writeFileSync(
      path.join(root, '.cc-bridge', 'config.json'),
      JSON.stringify({ defaultModel: 'claude-opus-4-7', defaultEffort: 'high' }),
    );
    const cfg = await loadConfig();
    expect(cfg.defaultModel).toBe('claude-opus-4-7');
    expect(cfg.defaultEffort).toBe('high');
  });
});

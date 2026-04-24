import { readFile } from 'node:fs/promises';
import { resolvePaths } from './paths.js';

export interface Config {
  readonly defaultModel: string;
  readonly defaultEffort?: string;
}

const DEFAULTS: Config = { defaultModel: 'claude-sonnet-4-6' };

export async function loadConfig(): Promise<Config> {
  const paths = resolvePaths();
  try {
    const raw = await readFile(paths.configFile, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<Config>;
    return {
      defaultModel: parsed.defaultModel ?? DEFAULTS.defaultModel,
      defaultEffort: parsed.defaultEffort,
    };
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return DEFAULTS;
    throw e;
  }
}

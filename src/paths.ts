import { homedir } from 'node:os';
import path from 'node:path';

export interface Paths {
  readonly root: string;
  readonly cliProjects: string;
  readonly desktopSessions: string;
  readonly bridgeHome: string;
  readonly historyLog: string;
  readonly configFile: string;
}

export function resolvePaths(): Paths {
  const root = process.env.CC_BRIDGE_TEST_ROOT ?? homedir();
  const bridgeHome = path.join(root, '.cc-bridge');
  return {
    root,
    cliProjects: path.join(root, '.claude', 'projects'),
    desktopSessions: path.join(root, 'Library', 'Application Support', 'Claude', 'claude-code-sessions'),
    bridgeHome,
    historyLog: path.join(bridgeHome, 'history.log'),
    configFile: path.join(bridgeHome, 'config.json'),
  };
}

// src/tui/App.tsx
import React from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { SourceStep } from './SourceStep.js';
import { ProjectStep } from './ProjectStep.js';
import { SessionStep } from './SessionStep.js';
import { ActionStep, type ActionKind } from './ActionStep.js';
import { linkSession } from '../commands/link.js';
import { unlinkSession } from '../commands/unlink.js';
import { buildOpenInvocation } from '../commands/open.js';
import type { SessionSummary, Surface } from '../discovery/types.js';

export interface HandoffCommand {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
}

export function renderHandoff(cmd: HandoffCommand): HandoffCommand {
  return cmd;
}

type Step =
  | { kind: 'source' }
  | { kind: 'project'; source: Surface }
  | { kind: 'session'; source: Surface; cwd: string | null }
  | { kind: 'action'; row: SessionSummary }
  | { kind: 'result'; message: string };

export interface AppProps {
  readonly onExit?: (handoff: HandoffCommand | null) => void;
}

export const App: React.FC<AppProps> = ({ onExit }) => {
  const { exit } = useApp();
  const [step, setStep] = React.useState<Step>({ kind: 'source' });
  useInput((input) => {
    if (input === 'q') {
      onExit?.(null);
      exit();
    }
  });

  if (step.kind === 'source') return <SourceStep onPick={(surface) => setStep({ kind: 'project', source: surface })} />;
  if (step.kind === 'project') return (
    <ProjectStep source={step.source}
      onPick={(cwd) => setStep({ kind: 'session', source: step.source, cwd })}
      onBack={() => setStep({ kind: 'source' })} />
  );
  if (step.kind === 'session') return (
    <SessionStep source={step.source} cwd={step.cwd}
      onPick={(row) => setStep({ kind: 'action', row })}
      onBack={() => setStep({ kind: 'project', source: step.source })} />
  );
  if (step.kind === 'action') return (
    <ActionStep row={step.row}
      onPick={async (a: ActionKind) => {
        try {
          if (a === 'link') {
            const r = await linkSession({ cliSessionId: step.row.cliSessionId });
            setStep({ kind: 'result', message: `link: ${r.status} → ${r.manifestPath}` });
          } else if (a === 'unlink') {
            const r = await unlinkSession({ cliSessionId: step.row.cliSessionId });
            setStep({ kind: 'result', message: `unlink: removed ${r.removed.length}, skipped foreign ${r.skippedForeign.length}` });
          } else {
            const inv = await buildOpenInvocation({ cliSessionId: step.row.cliSessionId });
            onExit?.({ command: inv.command, args: [...inv.args], cwd: inv.cwd });
            exit();
          }
        } catch (e: unknown) {
          setStep({ kind: 'result', message: `error: ${(e as Error).message}` });
        }
      }}
      onBack={() => setStep({ kind: 'session', source: 'cli', cwd: step.row.cwd })}
    />
  );
  return (
    <Box flexDirection="column">
      <Text>{step.message}</Text>
      <Text dimColor>press q to exit</Text>
    </Box>
  );
};

export async function runTui(): Promise<HandoffCommand | null> {
  const { render } = await import('ink');
  return await new Promise<HandoffCommand | null>((resolve) => {
    let handoff: HandoffCommand | null = null;
    const instance = render(
      <App onExit={(h) => {
        handoff = h;
      }} />,
    );
    instance.waitUntilExit().then(() => resolve(handoff));
  });
}

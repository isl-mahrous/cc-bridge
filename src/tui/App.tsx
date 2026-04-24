import React from 'react';
import { useApp, useInput } from 'ink';
import { SourceStep } from './SourceStep.js';
import { ProjectStep } from './ProjectStep.js';
import { SessionStep } from './SessionStep.js';
import type { SessionSummary, Surface } from '../discovery/types.js';

type Step =
  | { kind: 'source' }
  | { kind: 'project'; source: Surface }
  | { kind: 'session'; source: Surface; cwd: string | null }
  | { kind: 'done'; row: SessionSummary };

export const App: React.FC = () => {
  const { exit } = useApp();
  const [step, setStep] = React.useState<Step>({ kind: 'source' });
  useInput((input) => { if (input === 'q') exit(); });

  if (step.kind === 'source') return <SourceStep onPick={(surface) => setStep({ kind: 'project', source: surface })} />;
  if (step.kind === 'project') {
    return (
      <ProjectStep
        source={step.source}
        onPick={(cwd) => setStep({ kind: 'session', source: step.source, cwd })}
        onBack={() => setStep({ kind: 'source' })}
      />
    );
  }
  if (step.kind === 'session') {
    return (
      <SessionStep
        source={step.source}
        cwd={step.cwd}
        onPick={(row) => setStep({ kind: 'done', row })}
        onBack={() => setStep({ kind: 'project', source: step.source })}
      />
    );
  }
  return null;
};

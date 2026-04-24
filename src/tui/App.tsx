import React from 'react';
import { useApp, useInput } from 'ink';
import { SourceStep } from './SourceStep.js';
import { ProjectStep } from './ProjectStep.js';
import type { Surface } from '../discovery/types.js';

type Step =
  | { kind: 'source' }
  | { kind: 'project'; source: Surface }
  | { kind: 'done'; source: Surface; cwd: string | null };

export const App: React.FC = () => {
  const { exit } = useApp();
  const [step, setStep] = React.useState<Step>({ kind: 'source' });
  useInput((input) => { if (input === 'q') exit(); });

  if (step.kind === 'source') {
    return <SourceStep onPick={(surface) => setStep({ kind: 'project', source: surface })} />;
  }
  if (step.kind === 'project') {
    return (
      <ProjectStep
        source={step.source}
        onPick={(cwd) => setStep({ kind: 'done', source: step.source, cwd })}
        onBack={() => setStep({ kind: 'source' })}
      />
    );
  }
  return null;
};

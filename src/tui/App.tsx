import React from 'react';
import { useApp, useInput } from 'ink';
import { SourceStep } from './SourceStep.js';
import type { Surface } from '../discovery/types.js';

type Step = { kind: 'source' } | { kind: 'done'; surface: Surface };

export const App: React.FC = () => {
  const { exit } = useApp();
  const [step, setStep] = React.useState<Step>({ kind: 'source' });
  useInput((input) => { if (input === 'q') exit(); });

  if (step.kind === 'source') {
    return <SourceStep onPick={(surface) => setStep({ kind: 'done', surface })} />;
  }
  return null;
};

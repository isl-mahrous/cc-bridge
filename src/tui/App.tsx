import React from 'react';
import { useApp, useInput, useStdin } from 'ink';
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

  // Buffer stdin data that arrives before passive effects (useInput) register
  // their listeners, so that early writes (e.g. in tests) are not lost.
  const { stdin, internal_eventEmitter } = useStdin();
  const earlyBuf = React.useRef<string[]>([]);
  React.useLayoutEffect(() => {
    const onData = (d: string) => earlyBuf.current.push(d);
    (stdin as NodeJS.EventEmitter).on('data', onData);
    return () => { (stdin as NodeJS.EventEmitter).off('data', onData); };
  }, [stdin]);
  // Replay after all child effects (including useInput handlers) have mounted.
  React.useEffect(() => {
    for (const d of earlyBuf.current) {
      internal_eventEmitter.emit('input', d);
    }
    earlyBuf.current = [];
  }, [internal_eventEmitter]);

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

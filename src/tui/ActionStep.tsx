// src/tui/ActionStep.tsx
import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { SessionSummary } from '../discovery/types.js';

export type ActionKind = 'open' | 'link' | 'unlink';

export interface ActionStepProps {
  readonly row: SessionSummary;
  readonly onPick: (a: ActionKind) => void;
  readonly onBack: () => void;
}

export const ActionStep: React.FC<ActionStepProps> = ({ row, onPick, onBack }) => {
  const options: ReadonlyArray<{ kind: ActionKind; label: string; hint: string; disabled?: boolean }> = [
    { kind: 'open', label: 'Open in CLI', hint: `exec 'claude --resume ${row.cliSessionId.slice(0, 8)}…' in ${row.cwd}` },
    {
      kind: 'link',
      label: 'Link to Desktop',
      hint: row.hasBridgeManifest ? '(already linked)' : 'write a new Desktop manifest pointing at this session',
      disabled: row.hasBridgeManifest,
    },
    {
      kind: 'unlink',
      label: 'Unlink',
      hint: row.hasBridgeManifest ? 'remove Desktop manifests cc-bridge created' : '(nothing to unlink)',
      disabled: !row.hasBridgeManifest,
    },
  ];
  const [index, setIndex] = React.useState(0);
  useInput((_input, key) => {
    if (key.upArrow) setIndex((i) => Math.max(0, i - 1));
    if (key.downArrow) setIndex((i) => Math.min(options.length - 1, i + 1));
    if (key.leftArrow || key.escape) onBack();
    if (key.return) {
      const o = options[index]!;
      if (!o.disabled) onPick(o.kind);
    }
  });
  return (
    <Box flexDirection="column">
      <Text bold>Action — {row.title}</Text>
      {options.map((o, i) => (
        <Text key={o.kind} color={i === index ? (o.disabled ? 'yellow' : 'green') : undefined} dimColor={o.disabled}>
          {i === index ? '› ' : '  '}{o.label} · {o.hint}
        </Text>
      ))}
      <Text dimColor>↑/↓ · enter · esc to go back · q to quit</Text>
    </Box>
  );
};

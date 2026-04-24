import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { Surface } from '../discovery/types.js';

export interface SourceStepProps {
  readonly onPick: (s: Surface) => void;
}

export const SourceStep: React.FC<SourceStepProps> = ({ onPick }) => {
  const [index, setIndex] = React.useState(0);
  const options: ReadonlyArray<{ surface: Surface; label: string }> = [
    { surface: 'cli', label: 'Claude Code CLI' },
    { surface: 'desktop', label: 'Claude Desktop Code' },
  ];
  useInput((_input, key) => {
    if (key.upArrow) setIndex((i) => Math.max(0, i - 1));
    if (key.downArrow) setIndex((i) => Math.min(options.length - 1, i + 1));
    if (key.return) onPick(options[index]!.surface);
  });
  return (
    <Box flexDirection="column">
      <Text bold>Source</Text>
      {options.map((o, i) => (
        <Text key={o.surface} color={i === index ? 'green' : undefined}>
          {i === index ? '› ' : '  '}{o.label}
        </Text>
      ))}
      <Text dimColor>↑/↓ to move · enter to select · q to quit</Text>
    </Box>
  );
};

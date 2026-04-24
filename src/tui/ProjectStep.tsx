import React from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { listSessions } from '../commands/list.js';
import type { Surface } from '../discovery/types.js';

export interface ProjectStepProps {
  readonly source: Surface;
  readonly onPick: (cwd: string | null) => void; // null = [all projects]
  readonly onBack: () => void;
}

export const ProjectStep: React.FC<ProjectStepProps> = ({ source, onPick, onBack }) => {
  const [loading, setLoading] = React.useState(true);
  const [projects, setProjects] = React.useState<Array<{ cwd: string; count: number }>>([]);
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    void (async () => {
      const rows = await listSessions({ source });
      const counts = new Map<string, number>();
      for (const r of rows) counts.set(r.cwd, (counts.get(r.cwd) ?? 0) + 1);
      const list = [...counts.entries()]
        .map(([cwd, count]) => ({ cwd, count }))
        .sort((a, b) => b.count - a.count);
      setProjects(list);
      setLoading(false);
    })();
  }, [source]);

  useInput((_input, key) => {
    if (loading) return;
    const total = projects.length + 1; // + [all]
    if (key.upArrow) setIndex((i) => Math.max(0, i - 1));
    if (key.downArrow) setIndex((i) => Math.min(total - 1, i + 1));
    if (key.leftArrow || key.escape) onBack();
    if (key.return) onPick(index === projects.length ? null : projects[index]!.cwd);
  });

  if (loading) {
    return <Box><Text><Spinner type="dots" /> loading projects…</Text></Box>;
  }
  return (
    <Box flexDirection="column">
      <Text bold>Project ({source})</Text>
      {projects.map((p, i) => (
        <Text key={p.cwd} color={i === index ? 'green' : undefined}>
          {i === index ? '› ' : '  '}{p.cwd} ({p.count})
        </Text>
      ))}
      <Text color={index === projects.length ? 'green' : undefined}>
        {index === projects.length ? '› ' : '  '}[ all projects ]
      </Text>
      <Text dimColor>↑/↓ · enter to select · esc to go back · q to quit</Text>
    </Box>
  );
};

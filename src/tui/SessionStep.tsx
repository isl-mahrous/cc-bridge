import React from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';
import { listSessions } from '../commands/list.js';
import type { SessionSummary, Surface } from '../discovery/types.js';

export interface SessionStepProps {
  readonly source: Surface;
  readonly cwd: string | null;
  readonly onPick: (row: SessionSummary) => void;
  readonly onBack: () => void;
  readonly onSearchingChange?: (searching: boolean) => void;
}

export const SessionStep: React.FC<SessionStepProps> = ({ source, cwd, onPick, onBack, onSearchingChange }) => {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<SessionSummary[]>([]);
  const [index, setIndex] = React.useState(0);
  const [query, setQuery] = React.useState('');
  const [searching, setSearching] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      const all = await listSessions({ source, cwd: cwd ?? undefined });
      setRows(all);
      setLoading(false);
    })();
  }, [source, cwd]);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.cliSessionId.toLowerCase().startsWith(q),
    );
  }, [rows, query]);

  React.useEffect(() => { setIndex(0); }, [query]);

  React.useEffect(() => { onSearchingChange?.(searching); }, [searching, onSearchingChange]);

  useInput((input, key) => {
    if (loading) return;
    if (searching) {
      if (key.escape) { setSearching(false); return; }
      if (key.return) { setSearching(false); return; }
      return;
    }
    if (input === '/') { setSearching(true); return; }
    if (key.upArrow) setIndex((i) => Math.max(0, i - 1));
    if (key.downArrow) setIndex((i) => Math.min(filtered.length - 1, i + 1));
    if (key.leftArrow || key.escape) onBack();
    if (key.return && filtered[index]) onPick(filtered[index]!);
  });

  if (loading) return <Box><Text><Spinner type="dots" /> loading sessions…</Text></Box>;
  return (
    <Box flexDirection="column">
      <Text bold>Sessions ({filtered.length} of {rows.length})</Text>
      <Box>
        <Text>/ search: </Text>
        {searching ? (
          <TextInput value={query} onChange={setQuery} onSubmit={() => setSearching(false)} />
        ) : (
          <Text dimColor>{query || '(press / to search)'}</Text>
        )}
      </Box>
      {filtered.slice(0, 20).map((r, i) => {
        const last = r.lastActivityAt ? new Date(r.lastActivityAt).toISOString().slice(0, 10) : '-';
        const link = r.hasBridgeManifest ? '•' : ' ';
        return (
          <Text key={r.cliSessionId} color={i === index ? 'green' : undefined}>
            {i === index ? '› ' : '  '}
            {link} {r.cliSessionId.slice(0, 8)}  {last}  {r.title.slice(0, 60)}
          </Text>
        );
      })}
      <Text dimColor>↑/↓ · / search · enter to select · esc to go back · q to quit</Text>
    </Box>
  );
};

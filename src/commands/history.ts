import { readHistory, type HistoryRecord } from '../history-log.js';

export interface TailOptions {
  readonly limit: number;
}

export async function tailHistory(opts: TailOptions): Promise<HistoryRecord[]> {
  const all = await readHistory();
  return all.slice(Math.max(0, all.length - opts.limit));
}

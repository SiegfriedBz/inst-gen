import { GIVE_BACK_CODES, giveBackUsage, type Ticket } from './meter';

// A streamed run (the brand read, a post plan or rewrite) fails with an error
// line, often after its first lines: the owner's count comes back once, on a
// failure that isn't theirs.
export async function* giveBackOnError<L extends { type: string; code?: string }>(
  lines: AsyncGenerator<L>,
  ticket: Ticket,
): AsyncGenerator<L> {
  let given = false;
  try {
    for await (const line of lines) {
      if (!given && line.type === 'error' && line.code && GIVE_BACK_CODES.has(line.code)) {
        given = true;
        await giveBackUsage(ticket);
      }
      yield line;
    }
  } finally {
    await lines.return(undefined);
  }
}

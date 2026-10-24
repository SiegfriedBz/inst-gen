import { z } from 'zod';
import {
  type BrandErrorCode,
  ERROR_CODES,
  type PartialProfile,
  type Profile,
  profileSchema,
} from './profile';

// The brand read's response: one JSON object per line (NDJSON). Partials show
// progress; the final line is the checked profile the browser keeps.
export type StreamLine =
  | { type: 'partial'; profile: PartialProfile }
  | { type: 'final'; profile: Profile }
  | { type: 'error'; code: BrandErrorCode };

const lineSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('partial'), profile: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal('final'), profile: profileSchema }),
  z.object({ type: z.literal('error'), code: z.enum(ERROR_CODES) }),
]);

export function encodeLine(line: StreamLine): string {
  return `${JSON.stringify(line)}\n`;
}

function parseLine(raw: string): StreamLine {
  return lineSchema.parse(JSON.parse(raw)) as StreamLine;
}

export async function* readLines(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamLine> {
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true });
    let newline = buffer.indexOf('\n');
    while (newline !== -1) {
      const raw = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (raw) yield parseLine(raw);
      newline = buffer.indexOf('\n');
    }
  }
  const rest = (buffer + decoder.decode()).trim();
  if (rest) yield parseLine(rest);
}

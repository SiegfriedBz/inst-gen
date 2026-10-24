import { describe, expect, test } from 'vitest';
import { encodeLine, readLines, type StreamLine } from '@/lib/brand/stream';
import { svargaProfile } from './helpers/brand';

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

async function collect(body: ReadableStream<Uint8Array>): Promise<StreamLine[]> {
  const lines: StreamLine[] = [];
  for await (const line of readLines(body)) lines.push(line);
  return lines;
}

describe('encodeLine', () => {
  test('is one JSON object and a newline', () => {
    expect(encodeLine({ type: 'error', code: 'model_busy' })).toBe(
      '{"type":"error","code":"model_busy"}\n',
    );
  });
});

describe('readLines', () => {
  test('joins a line split over two chunks', async () => {
    const final = encodeLine({ type: 'final', profile: svargaProfile() });
    const first = `${encodeLine({ type: 'partial', profile: {} })}${final.slice(0, 15)}`;
    const lines = await collect(streamOf([first, final.slice(15)]));
    expect(lines.map((l) => l.type)).toEqual(['partial', 'final']);
  });

  test('throws on a final that fails the schema', async () => {
    const bad = '{"type":"final","profile":{"schemaVersion":1}}\n';
    await expect(collect(streamOf([bad]))).rejects.toThrow();
  });

  test('works on a stream that is not async-iterable (Safari)', async () => {
    const body = streamOf(['{"type":"error","code":"model_busy"}\n']);
    Object.defineProperty(body, Symbol.asyncIterator, { value: undefined });
    expect(await collect(body)).toEqual([{ type: 'error', code: 'model_busy' }]);
  });

  test('reads an error line', async () => {
    const lines = await collect(streamOf(['{"type":"error","code":"model_timeout"}\n']));
    expect(lines).toEqual([{ type: 'error', code: 'model_timeout' }]);
  });
});

// Reads a streamed response one JSON object per line (NDJSON), as the brand
// read and the post routes send them.
export async function* readNdjson<T>(
  body: ReadableStream<Uint8Array>,
  parse: (raw: string) => T,
): AsyncGenerator<T> {
  const decoder = new TextDecoder();
  let buffer = '';
  // A reader, not `for await`: Safari's ReadableStream isn't async-iterable.
  const reader = body.getReader();
  for (;;) {
    const { done, value: chunk } = await reader.read();
    if (done) break;
    buffer += decoder.decode(chunk, { stream: true });
    let newline = buffer.indexOf('\n');
    while (newline !== -1) {
      const raw = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (raw) yield parse(raw);
      newline = buffer.indexOf('\n');
    }
  }
  const rest = (buffer + decoder.decode()).trim();
  if (rest) yield parse(rest);
}

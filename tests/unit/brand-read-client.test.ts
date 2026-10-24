import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { type ReadDeps, type ReadEvent, resumeRead, startRead } from '@/lib/brand/read-client';
import { loadBrand, resetStoreForTests } from '@/lib/brand/store';
import { encodeLine, type StreamLine } from '@/lib/brand/stream';
import { newBrandRun } from '@/lib/runs/run-record';
import { loadOpenRun, saveRun } from '@/lib/runs/store';
import { svargaProfile } from './helpers/brand';

const profile = svargaProfile();
const partial: StreamLine = { type: 'partial', profile: { name: profile.name } };
const final: StreamLine = { type: 'final', profile };

function ndjson(lines: StreamLine[]): Response {
  return new Response(lines.map(encodeLine).join(''), {
    headers: { 'content-type': 'application/x-ndjson' },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;
let deps: ReadDeps;
let ids = 0;

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetStoreForTests();
  fetchMock = vi.fn();
  ids = 0;
  deps = {
    fetch: fetchMock as unknown as typeof fetch,
    now: () => new Date('2026-10-24T10:00:00Z'),
    newId: () => `run-${++ids}`,
  };
});

async function read(reread = false) {
  const events: ReadEvent[] = [];
  await startRead(
    { ownerId: 'sen', url: 'svargabalimassage.com', reread },
    (e) => events.push(e),
    deps,
  ).done;
  return events;
}

describe('a brand read from the browser', () => {
  test('streams partials, then saves the final profile and clears the run', async () => {
    fetchMock.mockResolvedValue(ndjson([partial, final]));
    const events = await read();
    expect(events).toEqual([
      { type: 'partial', profile: { name: profile.name } },
      { type: 'final', profile, kept: true },
    ]);
    expect(await loadBrand('sen')).toMatchObject({ kind: 'saved', record: { profile } });
    expect(await loadOpenRun('sen')).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/brand/read',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ url: 'svargabalimassage.com' }),
      }),
    );
  });

  test('an error line ends the read and keeps nothing', async () => {
    fetchMock.mockResolvedValue(ndjson([partial, { type: 'error', code: 'model_busy' }]));
    const events = await read();
    expect(events.at(-1)).toEqual({ type: 'error', code: 'model_busy' });
    expect(await loadBrand('sen')).toEqual({ kind: 'none' });
    expect(await loadOpenRun('sen')).toBeNull();
  });

  test('an error answer before the stream gives its code', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'invalid_url' }, { status: 400 }));
    expect(await read()).toEqual([{ type: 'error', code: 'invalid_url' }]);
    expect(await loadOpenRun('sen')).toBeNull();
  });

  test('an error answer that is not ours is model_failed', async () => {
    fetchMock.mockResolvedValue(new Response('Bad gateway', { status: 502 }));
    expect(await read()).toEqual([{ type: 'error', code: 'model_failed' }]);
  });

  test('a 401 means signed out', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    expect(await read()).toEqual([{ type: 'signedOut' }]);
  });

  test('a dropped stream leaves the run to resume and says offline', async () => {
    fetchMock.mockResolvedValue(ndjson([partial]));
    const events = await read();
    expect(events.at(-1)).toEqual({ type: 'offline' });
    expect((await loadOpenRun('sen'))?.steps[0]?.status).toBe('running');
  });

  test('a fetch that fails says offline and keeps the run', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await read()).toEqual([{ type: 'offline' }]);
    expect(await loadOpenRun('sen')).not.toBeNull();
  });

  test('resume re-requests an interrupted read once, as a re-read if it was one', async () => {
    await saveRun(
      newBrandRun(
        { ownerId: 'sen', url: 'svargabalimassage.com', reread: true },
        deps.now(),
        'old',
      ),
    );
    fetchMock.mockResolvedValue(ndjson([final]));
    const events: ReadEvent[] = [];
    const [a, b] = await Promise.all([
      resumeRead('sen', (e) => events.push(e), deps),
      resumeRead('sen', (e) => events.push(e), deps),
    ]);
    const resumed = [a, b].filter((r) => r !== null);
    expect(resumed).toHaveLength(1);
    expect(resumed[0]?.reread).toBe(true);
    await resumed[0]?.done;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(events).toEqual([{ type: 'final', profile, kept: true }]);
    expect(await loadOpenRun('sen')).toBeNull();
  });

  test('nothing to resume after a finished read', async () => {
    fetchMock.mockResolvedValue(ndjson([final]));
    await read();
    expect(await resumeRead('sen', () => {}, deps)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('a read in flight is not resumed a second time', async () => {
    let release: (r: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (release = resolve)));
    const running = startRead({ ownerId: 'sen', url: 'x.com', reread: false }, () => {}, deps);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(await resumeRead('sen', () => {}, deps)).toBeNull();
    release(ndjson([final]));
    await running.done;
  });

  test('a malformed line ends the read as model_failed and keeps nothing', async () => {
    fetchMock.mockResolvedValue(
      new Response(`${encodeLine(partial)}not json\n`, {
        headers: { 'content-type': 'application/x-ndjson' },
      }),
    );
    const events = await read();
    expect(events.at(-1)).toEqual({ type: 'error', code: 'model_failed' });
    expect(await loadOpenRun('sen')).toBeNull();
  });

  test('each resume is counted on the run', async () => {
    await saveRun(newBrandRun({ ownerId: 'sen', url: 'x.com', reread: false }, deps.now(), 'old'));
    fetchMock.mockResolvedValue(ndjson([partial]));
    await (await resumeRead('sen', () => {}, deps))?.done;
    expect((await loadOpenRun('sen'))?.resumes).toBe(1);
  });

  test('a read that keeps dropping gives up after 2 resumes', async () => {
    await saveRun({
      ...newBrandRun({ ownerId: 'sen', url: 'x.com', reread: false }, deps.now(), 'old'),
      resumes: 2,
    });
    const events: ReadEvent[] = [];
    expect(await resumeRead('sen', (e) => events.push(e), deps)).toBeNull();
    expect(events).toEqual([{ type: 'error', code: 'model_failed' }]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await loadOpenRun('sen')).toBeNull();
  });

  test('stop after a dropped stream deletes the run, so it is not resumed', async () => {
    fetchMock.mockResolvedValue(ndjson([partial]));
    const running = startRead({ ownerId: 'sen', url: 'x.com', reread: false }, () => {}, deps);
    await running.done;
    running.stop();
    await vi.waitFor(async () => expect(await loadOpenRun('sen')).toBeNull());
  });

  test('stop aborts, deletes the run and sends nothing', async () => {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_, reject) =>
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          ),
        ),
    );
    const events: ReadEvent[] = [];
    const running = startRead(
      { ownerId: 'sen', url: 'x.com', reread: false },
      (e) => events.push(e),
      deps,
    );
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    running.stop();
    await running.done;
    expect(events).toEqual([]);
    expect(await loadOpenRun('sen')).toBeNull();
  });
});

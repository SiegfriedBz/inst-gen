// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { BrandHome } from '@/components/brand/brand-home';
import type { Profile } from '@/lib/brand/profile';
import { loadBrand, openStore, resetStoreForTests, saveBrand } from '@/lib/brand/store';
import { encodeLine, type StreamLine } from '@/lib/brand/stream';
import { newBrandRun } from '@/lib/runs/run-record';
import { saveRun } from '@/lib/runs/store';
import messages from '@/messages/en.json';
import { svargaProfile } from './helpers/brand';

const profile = svargaProfile();
const INTRO = /This is what we understood about Svarga/;

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetStoreForTests();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function ndjson(lines: StreamLine[]): Response {
  return new Response(lines.map(encodeLine).join(''), {
    headers: { 'content-type': 'application/x-ndjson' },
  });
}

// A fetch that waits until released, and fails when aborted.
function deferredFetch() {
  let release: (r: Response) => void = () => {};
  fetchMock.mockImplementation(
    (_url: string, init: RequestInit) =>
      new Promise<Response>((resolve, reject) => {
        release = resolve;
        init.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        );
      }),
  );
  return (r: Response) => release(r);
}

function renderHome() {
  render(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
      <BrandHome ownerId="sen" />
    </NextIntlClientProvider>,
  );
}

const withEdits = (): Profile => ({
  ...profile,
  hours: { value: '9am to midnight', source: 'owner' },
  contact: { ...profile.contact, email: { value: 'book@svarga.com', source: 'owner' } },
});

async function typeAndRead(url: string) {
  fireEvent.change(await screen.findByLabelText('Your website'), { target: { value: url } });
  fireEvent.click(screen.getByRole('button', { name: 'Read my website' }));
}

describe('BrandHome', () => {
  test('a first read shows the reading state, then the editable panel, and saves it', async () => {
    const release = deferredFetch();
    renderHome();
    await typeAndRead('svargabalimassage.com');
    expect(await screen.findByText('Reading your website…')).toBeTruthy();
    expect(screen.getByText('Keep this page open for about 20 seconds.')).toBeTruthy();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    release(
      ndjson([
        { type: 'partial', profile: { name: profile.name } },
        { type: 'final', profile },
      ]),
    );
    expect(await screen.findByText(INTRO)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit Your business' })).toBeTruthy();
    expect(await loadBrand('sen')).toMatchObject({ kind: 'saved' });
  });

  test('a saved profile opens on the panel with no request', async () => {
    await saveBrand('sen', profile);
    renderHome();
    expect(await screen.findByText(INTRO)).toBeTruthy();
    expect(screen.getByText(/Last read/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('an empty field only focuses it', async () => {
    renderHome();
    const field = await screen.findByLabelText('Your website');
    fireEvent.click(screen.getByRole('button', { name: 'Read my website' }));
    expect(document.activeElement).toBe(field);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('an error answer shows its message above the field, kept as typed', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'unreachable' }, { status: 502 }));
    renderHome();
    await typeAndRead('svarga.example');
    expect(
      await screen.findByText(
        "We couldn't open your website. Check the address, or try again in a few minutes.",
      ),
    ).toBeTruthy();
    expect((screen.getByLabelText('Your website') as HTMLInputElement).value).toBe(
      'svarga.example',
    );
  });

  test('an invalid saved record shows the notice and the empty field', async () => {
    const db = await openStore();
    await db?.put('brands', {
      ownerId: 'sen',
      profile: { schemaVersion: 2 } as never,
      savedAt: '',
    });
    renderHome();
    expect(
      await screen.findByText("We couldn't open your saved business. Read your website again."),
    ).toBeTruthy();
    expect(screen.getByLabelText('Your website')).toBeTruthy();
  });

  test('without IndexedDB the read still shows the panel, with the notice', async () => {
    vi.stubGlobal('indexedDB', undefined);
    resetStoreForTests();
    fetchMock.mockResolvedValue(ndjson([{ type: 'final', profile }]));
    renderHome();
    await typeAndRead('svargabalimassage.com');
    expect(await screen.findByText(INTRO)).toBeTruthy();
    expect(
      screen.getByText(
        "This browser won't keep your business: you'll need to read your site again next time.",
      ),
    ).toBeTruthy();
  });

  test('re-read with 2 edits asks, and cancel makes no request', async () => {
    await saveBrand('sen', withEdits());
    renderHome();
    fireEvent.click(await screen.findByRole('button', { name: 'Re-read my website' }));
    expect(await screen.findByText('Read your website again?')).toBeTruthy();
    expect(
      screen.getByText('Your 2 changes will be replaced by what your site says now.'),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText('Read your website again?')).toBeNull());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('re-read counts an edit to a field without a source', async () => {
    await saveBrand('sen', profile, new Date(), ['tone']);
    renderHome();
    fireEvent.click(await screen.findByRole('button', { name: 'Re-read my website' }));
    expect(
      await screen.findByText('Your 1 change will be replaced by what your site says now.'),
    ).toBeTruthy();
  });

  test('editing the tone is remembered as an edit', async () => {
    await saveBrand('sen', profile);
    renderHome();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Your feeling' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Remove calm' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () =>
      expect(await loadBrand('sen')).toMatchObject({ record: { ownerEdited: ['tone'] } }),
    );
  });

  test('re-read without edits starts at once, from the saved site', async () => {
    await saveBrand('sen', profile);
    fetchMock.mockResolvedValue(ndjson([{ type: 'final', profile }]));
    renderHome();
    fireEvent.click(await screen.findByRole('button', { name: 'Re-read my website' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ url: profile.siteUrl }));
  });

  test('a failed re-read keeps the saved profile and shows the message', async () => {
    await saveBrand('sen', profile);
    fetchMock.mockResolvedValue(ndjson([{ type: 'error', code: 'model_busy' }]));
    renderHome();
    fireEvent.click(await screen.findByRole('button', { name: 'Re-read my website' }));
    expect(
      await screen.findByText("Shopfront has used today's free reading. Try again tomorrow."),
    ).toBeTruthy();
    expect(screen.getByText(INTRO)).toBeTruthy();
    expect(await loadBrand('sen')).toMatchObject({ kind: 'saved', record: { profile } });
  });

  test('forget deletes and shows the empty field', async () => {
    await saveBrand('sen', profile);
    renderHome();
    fireEvent.click(await screen.findByRole('button', { name: 'Forget this business' }));
    expect(await screen.findByText('Forget Svarga?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Forget' }));
    const field = (await screen.findByLabelText('Your website')) as HTMLInputElement;
    expect(field.value).toBe('');
    expect(await loadBrand('sen')).toEqual({ kind: 'none' });
  });

  test('going offline lets the screen sleep again', async () => {
    const release = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      ...navigator,
      wakeLock: { request: vi.fn().mockResolvedValue({ release }) },
    });
    fetchMock.mockResolvedValue(ndjson([{ type: 'partial', profile: { name: profile.name } }]));
    renderHome();
    await typeAndRead('svargabalimassage.com');
    expect(
      await screen.findByText("You're offline. We'll carry on when you're back."),
    ).toBeTruthy();
    await waitFor(() => expect(release).toHaveBeenCalled());
  });

  test('stop goes back to the field', async () => {
    deferredFetch();
    renderHome();
    await typeAndRead('svargabalimassage.com');
    fireEvent.click(await screen.findByRole('button', { name: 'Stop' }));
    expect(await screen.findByLabelText('Your website')).toBeTruthy();
    expect(screen.queryByText('Reading your website…')).toBeNull();
  });

  test('a stored running run is resumed on mount', async () => {
    await saveRun(
      newBrandRun(
        { ownerId: 'sen', url: 'svargabalimassage.com', reread: false },
        new Date(),
        'r1',
      ),
    );
    fetchMock.mockResolvedValue(ndjson([{ type: 'final', profile }]));
    renderHome();
    expect(await screen.findByText(INTRO)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('an edit saved in a section is kept on the phone', async () => {
    await saveBrand('sen', profile);
    renderHome();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Where and when' }));
    fireEvent.change(await screen.findByLabelText('Opening hours'), {
      target: { value: '9am to midnight' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('9am to midnight')).toBeTruthy();
    const stored = await loadBrand('sen');
    expect(stored.kind === 'saved' && stored.record.profile.hours?.source).toBe('owner');
  });
});

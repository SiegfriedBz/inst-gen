// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { BrandHome } from '@/components/brand/brand-home';
import type { Profile } from '@/lib/brand/profile';
import { loadBrand, openStore, resetStoreForTests, saveBrand } from '@/lib/brand/store';
import { encodeLine, type StreamLine } from '@/lib/brand/stream';
import { messagesFor } from '@/lib/i18n/messages';
import type { PostBatch } from '@/lib/posts/batch';
import { profileHash } from '@/lib/posts/input';
import { saveBatch } from '@/lib/posts/store';
import { newBrandRun } from '@/lib/runs/run-record';
import { saveRun } from '@/lib/runs/store';
import messages from '@/messages/en.json';
import { svargaProfile } from './helpers/brand';
import { post } from './helpers/posts';

// Already searched, so the read tests see no search request.
const profile: Profile = { ...svargaProfile(), searchedAt: '2026-10-24T09:30:00.000Z' };
const unsearched = svargaProfile();
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
      <BrandHome ownerId="sen" name="Sen" imagesOn={false} />
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
  test('the welcome shows only before a business is saved', async () => {
    renderHome();
    expect(await screen.findByRole('heading', { name: 'Welcome, Sen' })).toBeTruthy();
    cleanup();
    await saveBrand('sen', profile);
    renderHome();
    await screen.findByRole('tablist');
    expect(screen.queryByText('Welcome, Sen')).toBeNull();
  });

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
      profile: { schemaVersion: 3 } as never,
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
    await openTab('Your business');
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
    await openTab('Your business');
    fireEvent.click(await screen.findByRole('button', { name: 'Re-read my website' }));
    expect(
      await screen.findByText('Your 1 change will be replaced by what your site says now.'),
    ).toBeTruthy();
  });

  test('editing the tone is remembered as an edit', async () => {
    await saveBrand('sen', profile);
    renderHome();
    await openTab('Your business');
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
    await openTab('Your business');
    fireEvent.click(await screen.findByRole('button', { name: 'Re-read my website' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ url: profile.siteUrl }));
  });

  test('a failed re-read keeps the saved profile and shows the message', async () => {
    await saveBrand('sen', profile);
    fetchMock.mockResolvedValue(ndjson([{ type: 'error', code: 'model_busy' }]));
    renderHome();
    await openTab('Your business');
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
    await openTab('Your business');
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
    await openTab('Your business');
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

const tab = (name: string) => screen.getByRole('tab', { name });
const selected = (name: string) => tab(name).getAttribute('aria-selected');
async function openTab(name: string) {
  const trigger = await screen.findByRole('tab', { name });
  // Radix Tabs switches on mouse down.
  fireEvent.mouseDown(trigger, { button: 0 });
  await waitFor(() => expect(trigger.getAttribute('aria-selected')).toBe('true'));
}
const urls = () => fetchMock.mock.calls.map((call) => String(call[0]));

describe('the home tabs', () => {
  test('no tabs before a read', async () => {
    renderHome();
    await screen.findByLabelText('Your website');
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  test('a first read lands on Your business', async () => {
    const release = deferredFetch();
    renderHome();
    await typeAndRead('svargabalimassage.com');
    await screen.findByText('Reading your website…');
    expect(screen.queryByRole('tablist')).toBeNull();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    release(ndjson([{ type: 'final', profile }]));
    expect(await screen.findByRole('tablist', { name: 'Home' })).toBeTruthy();
    expect(selected('Your business')).toBe('true');
    expect(selected('Create Posts')).toBe('false');
    expect(screen.getByText(INTRO)).toBeTruthy();
  });

  test('a saved profile opens on Create your posts', async () => {
    await saveBrand('sen', profile);
    renderHome();
    await screen.findByRole('tablist', { name: 'Home' });
    expect(selected('Create Posts')).toBe('true');
    expect(await screen.findByRole('button', { name: 'Make 6 suggestions' })).toBeTruthy();
    expect(screen.getByText(INTRO).closest('[role="tabpanel"]')?.hasAttribute('hidden')).toBe(true);
    await openTab('Your business');
    expect(screen.getByText(INTRO)).toBeTruthy();
  });

  test('the third tab, Reviews, holds the review form', async () => {
    await saveBrand('sen', profile);
    renderHome();
    await screen.findByRole('tablist', { name: 'Home' });
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Your business',
      'Create Posts',
      'Reviews',
    ]);
    await openTab('Reviews');
    expect(await screen.findByRole('button', { name: 'Write 2 replies' })).toBeTruthy();
  });

  test('the tabs sit in a bar at the bottom, each with an icon', async () => {
    await saveBrand('sen', profile);
    renderHome();
    const list = await screen.findByRole('tablist', { name: 'Home' });
    const bar = list.closest('[data-tab-bar]');
    expect(bar).not.toBeNull();
    expect(bar?.className).toContain('fixed');
    expect(bar?.className).toContain('bottom-0');
    for (const tab of screen.getAllByRole('tab')) expect(tab.querySelector('svg')).not.toBeNull();
  });

  test('no bar before a business is saved', async () => {
    renderHome();
    await screen.findByLabelText('Your website');
    expect(document.querySelector('[data-tab-bar]')).toBeNull();
  });

  test('the usage line is the first line of each tab', async () => {
    await saveBrand('sen', profile);
    renderHome();
    await screen.findByRole('tablist', { name: 'Home' });
    const panels = document.querySelectorAll('[role="tabpanel"]');
    expect(panels).toHaveLength(3);
    for (const panel of panels) {
      expect(panel.firstElementChild?.getAttribute('data-testid')).toBe('usage-bar');
    }
  });

  test('the bar hides while typing with the keyboard up', async () => {
    const viewport = Object.assign(new EventTarget(), { height: 800 });
    vi.stubGlobal('visualViewport', viewport);
    vi.stubGlobal('innerHeight', 800);
    await saveBrand('sen', profile);
    renderHome();
    await screen.findByRole('tablist', { name: 'Home' });
    await openTab('Reviews');
    const bar = document.querySelector('[data-tab-bar]') as HTMLElement;
    expect(bar.hidden).toBe(false);
    const field = await screen.findByLabelText('The review');
    act(() => field.focus());
    expect(bar.hidden).toBe(false);
    viewport.height = 400;
    await act(async () => {
      viewport.dispatchEvent(new Event('resize'));
    });
    expect(bar.hidden).toBe(true);
    act(() => field.blur());
    await waitFor(() => expect(bar.hidden).toBe(false));
  });

  test('a re-read lands on Your business and the update waits for the tab', async () => {
    await saveBrand('sen', profile);
    const made: PostBatch = {
      id: 'b1',
      ownerId: 'sen',
      createdAt: new Date().toISOString(),
      profileReadAt: profile.readAt,
      profileHash: profileHash(profile),
      promptVersion: 'posts-1',
      model: 'm',
      posts: [post({ id: 'post-1' })],
      dropped: [],
    };
    await saveBatch(made);
    const reread: Profile = {
      ...profile,
      summary: { value: 'Massage at your villa', source: profile.siteUrl },
    };
    fetchMock.mockImplementation(async (url: string) =>
      url === '/api/brand/read'
        ? ndjson([{ type: 'final', profile: reread }])
        : new Promise<Response>(() => {}),
    );
    renderHome();
    await openTab('Your business');
    fireEvent.click(await screen.findByRole('button', { name: 'Re-read my website' }));
    await screen.findByText(/Massage at your villa/);
    expect(selected('Your business')).toBe('true');
    expect(urls()).toEqual(['/api/brand/read']);
    await openTab('Create Posts');
    await waitFor(() => expect(urls()).toContain('/api/posts/rewrite'));
  });

  test('switching tabs keeps a running posts request alive', async () => {
    await saveBrand('sen', profile);
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementation((_url: string, init: RequestInit) => {
      signal = init.signal ?? undefined;
      return new Promise<Response>(() => {});
    });
    renderHome();
    const make = (await screen.findByRole('button', {
      name: 'Make 6 suggestions',
    })) as HTMLButtonElement;
    await waitFor(() => expect(make.disabled).toBe(false));
    fireEvent.click(make);
    await waitFor(() => expect(urls()).toContain('/api/posts/plan'));
    await openTab('Your business');
    await openTab('Create Posts');
    expect(signal?.aborted).toBe(false);
  });
});

describe('a language change', () => {
  test('keeps the open tab and neither reloads nor searches again', async () => {
    await saveBrand('sen', unsearched);
    // The search answers "unavailable" at once, as without a key: nothing
    // in flight stops a second one.
    fetchMock.mockImplementation(async () =>
      Response.json({ error: 'search_unavailable' }, { status: 503 }),
    );
    const home = (locale: 'en' | 'vi') => (
      <NextIntlClientProvider locale={locale} messages={messagesFor(locale)} timeZone="UTC">
        <BrandHome ownerId="sen" name="Sen" imagesOn={false} />
      </NextIntlClientProvider>
    );
    const view = render(home('en'));
    await openTab('Your business');
    await waitFor(() => expect(urls()).toContain('/api/brand/search'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    const before = fetchMock.mock.calls.length;
    view.rerender(home('vi'));
    expect(await screen.findByRole('tab', { name: 'Doanh nghiệp' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Doanh nghiệp' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchMock.mock.calls.length).toBe(before);
  });
});

describe('BrandHome and the essence search', () => {
  const GUIDE = 'https://bali.travel/batur';
  const answer = {
    searchTerms: ['hotel massage canggu'],
    moments: [{ value: 'after a Mount Batur hike', source: GUIDE }],
    placeSymbols: [],
    dropped: [],
    searchedAt: '2026-10-24T12:00:00.000Z',
    searchPromptVersion: 'search-1',
  };
  const searchCalls = () =>
    fetchMock.mock.calls.filter(([url]) => String(url) === '/api/brand/search');

  // Answers the read with a final line and the search with `search`.
  function routes(search: () => Promise<Response>) {
    fetchMock.mockImplementation((url: string) =>
      url === '/api/brand/search'
        ? search()
        : Promise.resolve(ndjson([{ type: 'final', profile: unsearched }])),
    );
  }

  test('searches after a final read and shows the additions', async () => {
    routes(async () => Response.json(answer));
    renderHome();
    await typeAndRead('svargabalimassage.com');
    expect(await screen.findByRole('link', { name: 'seen on bali.travel' })).toBeTruthy();
    expect(screen.getByText('hotel massage canggu')).toBeTruthy();
    expect(searchCalls()).toHaveLength(1);
    const body = JSON.parse(String(searchCalls()[0]?.[1]?.body));
    expect(body).toMatchObject({ category: 'massage spa', town: 'Canggu', country: 'ID' });
    expect(body).not.toHaveProperty('name');
    await waitFor(async () => {
      const stored = await loadBrand('sen');
      expect(stored.kind === 'saved' && stored.record.profile.searchedAt).toBe(answer.searchedAt);
    });
  });

  test('shows the searching line while search runs', async () => {
    routes(() => new Promise<Response>(() => {}));
    renderHome();
    await typeAndRead('svargabalimassage.com');
    expect(await screen.findByText('Looking up what people search for…')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit Your feeling' })).toBeTruthy();
  });

  test('searches once on load when searchedAt is null, and not when set', async () => {
    routes(async () => Response.json(answer));
    await saveBrand('sen', unsearched);
    renderHome();
    expect(await screen.findByText('hotel massage canggu')).toBeTruthy();
    expect(searchCalls()).toHaveLength(1);
    cleanup();
    fetchMock.mockClear();
    renderHome();
    expect(await screen.findByText(INTRO)).toBeTruthy();
    expect(searchCalls()).toHaveLength(0);
  });

  test('sends one search when the load and a visibility change both ask', async () => {
    routes(() => new Promise<Response>(() => {}));
    await saveBrand('sen', unsearched);
    renderHome();
    await screen.findByText('Looking up what people search for…');
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('online'));
    expect(searchCalls()).toHaveLength(1);
  });

  test('waits for the feeling sheet to close before merging', async () => {
    let answerSearch: (r: Response) => void = () => {};
    routes(() => new Promise<Response>((resolve) => (answerSearch = resolve)));
    await saveBrand('sen', unsearched);
    renderHome();
    await openTab('Your business');
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Your feeling' }));
    await waitFor(() => expect(searchCalls()).toHaveLength(1));
    answerSearch(Response.json(answer));
    const feeling = await screen.findByRole('group', { name: 'How guests should feel' });
    fireEvent.click(within(feeling).getByRole('button', { name: 'Remove relaxing' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('hotel massage canggu')).toBeTruthy();
    const stored = await loadBrand('sen');
    if (stored.kind !== 'saved') throw new Error('not saved');
    expect(stored.record.profile.essence.feeling).toEqual(['warm', 'cared for']);
    expect(stored.record.profile.essence.searchTerms).toEqual(['hotel massage canggu']);
  });

  test('keeps the panel on a failed search and shows the line', async () => {
    routes(async () => Response.json({ error: 'search_busy' }, { status: 503 }));
    await saveBrand('sen', unsearched);
    renderHome();
    expect(
      await screen.findByText("We couldn't look this up today. We'll try again next time."),
    ).toBeTruthy();
    expect(screen.getByText(INTRO)).toBeTruthy();
    const stored = await loadBrand('sen');
    expect(stored.kind === 'saved' && stored.record.profile.searchedAt).toBeNull();
  });

  test('shows nothing about search without a key', async () => {
    routes(async () => Response.json({ error: 'search_unavailable' }, { status: 503 }));
    await saveBrand('sen', unsearched);
    renderHome();
    await waitFor(() => expect(searchCalls()).toHaveLength(1));
    await screen.findByText(INTRO);
    await waitFor(() =>
      expect(screen.queryByText('Looking up what people search for…')).toBeNull(),
    );
    expect(screen.queryByText(/We couldn't look this up/)).toBeNull();
  });

  test('skips search without a town', async () => {
    routes(async () => Response.json(answer));
    const p = svargaProfile();
    p.location.town = null;
    await saveBrand('sen', p);
    renderHome();
    expect(await screen.findByText(INTRO)).toBeTruthy();
    expect(searchCalls()).toHaveLength(0);
  });

  test('a tab that cannot take the search lock sends no search', async () => {
    routes(async () => Response.json(answer));
    vi.stubGlobal('navigator', {
      ...navigator,
      locks: {
        request: (_name: string, _opts: unknown, fn: (lock: null) => Promise<void>) => fn(null),
      },
    });
    await saveBrand('sen', unsearched);
    renderHome();
    expect(await screen.findByText(INTRO)).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(searchCalls()).toHaveLength(0);
    expect(screen.queryByText('Looking up what people search for…')).toBeNull();
  });
});

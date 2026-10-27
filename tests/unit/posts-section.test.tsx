// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { PostsSection } from '@/components/posts/posts-section';
import type { Profile } from '@/lib/brand/profile';
import { resetStoreForTests, saveBrand } from '@/lib/brand/store';
import { messagesFor } from '@/lib/i18n/messages';
import type { Post, PostBatch } from '@/lib/posts/batch';
import { loadImages, type SavedImage, saveImage } from '@/lib/posts/image-store';
import { profileHash } from '@/lib/posts/input';
import type { Offer } from '@/lib/posts/offer';
import { loadBatches, saveBatch } from '@/lib/posts/store';
import { encodePostsLine, type PostsLine } from '@/lib/posts/stream';
import { newPostsRun } from '@/lib/runs/run-record';
import { saveRun } from '@/lib/runs/store';
import messages from '@/messages/en.json';
import { svargaProfile } from './helpers/brand';
import { post } from './helpers/posts';

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // Today, past the reset (07:00 UTC): the fixtures' 09:00 attempts are today's.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-25T12:00:00.000Z'));
  globalThis.indexedDB = new IDBFactory();
  resetStoreForTests();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.unstubAllGlobals();
});

function ndjson(lines: PostsLine[]): Response {
  return new Response(lines.map(encodePostsLine).join(''), {
    headers: { 'content-type': 'application/x-ndjson' },
  });
}

function batch(posts: Post[], hash = profileHash(svargaProfile())): PostBatch {
  return {
    id: 'b1',
    ownerId: 'svarga',
    createdAt: '2026-10-25T09:00:00.000Z',
    profileReadAt: '2026-10-24T09:00:00.000Z',
    profileHash: hash,
    promptVersion: 'posts-1',
    model: 'gemini-3.5-flash-lite',
    posts,
    dropped: [],
  };
}

type Shown = { active?: boolean; searching?: boolean };

function section(profile: Profile, { active = true, searching = false }: Shown = {}) {
  return (
    <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
      <PostsSection
        ownerId="svarga"
        profile={profile}
        imagesOn={false}
        active={active}
        searching={searching}
      />
    </NextIntlClientProvider>
  );
}

async function renderSection(profile: Profile = svargaProfile(), shown: Shown = {}) {
  await saveBrand('svarga', profile);
  return render(section(profile, shown));
}

// The button, once the first look for a lost run has ended.
async function readyButton(): Promise<HTMLButtonElement> {
  const button = await makeButton();
  await waitFor(() => expect(button.disabled).toBe(false));
  return button;
}

const image = (batchId: string, postId: string): SavedImage => ({
  batchId,
  postId,
  ownerId: 'svarga',
  post: new Blob(['p'], { type: 'image/jpeg' }),
  story: new Blob(['s'], { type: 'image/jpeg' }),
  imagePrompt: 'A villa deck at dusk',
  model: 'm',
  promptVersion: 'images-1',
  createdAt: '2026-10-24T10:00:00.000Z',
});

const makeButton = async () =>
  (await screen.findByRole('button', { name: /Make/ })) as HTMLButtonElement;

// Opens suggestion n of an attempt of `count` and returns its sheet.
async function openTile(n: number, count = 6): Promise<HTMLElement> {
  const name = new RegExp(`^Suggestion ${n} of ${count}\\b`);
  // Found again each time: the tiles of a streaming attempt are replaced
  // once it's kept.
  await waitFor(() =>
    expect((screen.getByRole('button', { name }) as HTMLButtonElement).disabled).toBe(false),
  );
  fireEvent.click(screen.getByRole('button', { name }));
  return screen.findByRole('dialog');
}

const changed = (): Profile => {
  const profile = svargaProfile();
  return { ...profile, summary: { value: 'Massage at your villa', source: profile.siteUrl } };
};
const sixPosts = Array.from({ length: 6 }, (_, i) =>
  post({ id: `post-${i + 1}`, caption: `Caption ${i + 1}.` }),
);
const rewriteAnswer = (ids: string[]) =>
  ndjson([
    {
      type: 'final',
      result: {
        posts: sixPosts
          .filter((p) => ids.includes(p.id))
          .map((p) => ({ ...p, caption: `New ${p.id}.` })),
        dropped: [],
        promptVersion: 'posts-1',
        model: 'm',
        profileHash: profileHash(changed()),
      },
    },
  ]);
const sentIds = (call: unknown[]) =>
  JSON.parse((call[1] as RequestInit).body as string).posts.map((p: { id: string }) => p.id);

const UPDATING = 'Updating your captions to match your business…';
const errorAnswer = () => ndjson([{ type: 'error', code: 'model_busy' }]);
const rewriteCalls = () =>
  fetchMock.mock.calls.filter((call) => String(call[0]).endsWith('/api/posts/rewrite'));

describe('captions follow the business by themselves', () => {
  test('captions follow a business edit with no tap', async () => {
    const posts = sixPosts.map((p, i) => (i < 2 ? { ...p, edited: true } : p));
    await saveBatch(batch(posts));
    fetchMock.mockResolvedValue(rewriteAnswer(['post-3', 'post-4', 'post-5', 'post-6']));
    await renderSection(changed());
    await screen.findByText('New post-3.');
    expect(rewriteCalls()).toHaveLength(1);
    expect(sentIds(rewriteCalls()[0])).toEqual(['post-3', 'post-4', 'post-5', 'post-6']);
    expect(screen.getByText('Caption 1.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Update captions' })).toBeNull();
  });

  test('the updating line shows while the update runs', async () => {
    await saveBatch(batch(sixPosts));
    fetchMock.mockReturnValue(new Promise<Response>(() => {}));
    await renderSection(changed());
    expect(await screen.findByText(UPDATING)).toBeTruthy();
    expect(
      screen.getByText('Keep this page open for about a minute while your posts are made.'),
    ).toBeTruthy();
  });

  test('nothing is sent while the tab is hidden', async () => {
    await saveBatch(batch(sixPosts));
    fetchMock.mockResolvedValue(rewriteAnswer(sixPosts.map((p) => p.id)));
    const profile = changed();
    const view = await renderSection(profile, { active: false });
    await readyButton();
    expect(rewriteCalls()).toHaveLength(0);
    view.rerender(section(profile));
    await screen.findByText('New post-1.');
    expect(rewriteCalls()).toHaveLength(1);
  });

  test('nothing is sent while the essence search runs', async () => {
    await saveBatch(batch(sixPosts));
    fetchMock.mockResolvedValue(rewriteAnswer(sixPosts.map((p) => p.id)));
    const profile = changed();
    const view = await renderSection(profile, { searching: true });
    await screen.findByText('Caption 1.');
    expect(await screen.findByText(UPDATING)).toBeTruthy();
    expect(rewriteCalls()).toHaveLength(0);
    view.rerender(section(profile));
    await screen.findByText('New post-1.');
    expect(rewriteCalls()).toHaveLength(1);
  });

  test("the posts' buttons wait with the update while the search runs", async () => {
    const posts = sixPosts.map((p, i) => (i === 0 ? { ...p, edited: true } : p));
    await saveBatch(batch(posts));
    await renderSection(changed(), { searching: true });
    await screen.findByText(UPDATING);
    const more = (await makeButton()) as HTMLButtonElement;
    await waitFor(() => expect(more.disabled).toBe(true));
    const sheet = await openTile(1);
    const edit = within(sheet).getByRole('button', { name: 'Edit the text' }) as HTMLButtonElement;
    expect(edit.disabled).toBe(true);
    const rewrite = within(sheet).getByRole('button', {
      name: 'Rewrite this one too',
    }) as HTMLButtonElement;
    expect(rewrite.disabled).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('a failed automatic update shows Update captions and sends nothing more until the tab opens again', async () => {
    await saveBatch(batch(sixPosts));
    fetchMock.mockImplementation(async () => errorAnswer());
    const view = await renderSection(changed());
    expect(await screen.findByRole('button', { name: 'Update captions' })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toMatch(/today's free writing/);
    expect(screen.queryByText(UPDATING)).toBeNull();
    view.rerender(section(changed()));
    await readyButton();
    expect(rewriteCalls()).toHaveLength(1);
    view.rerender(section(changed(), { active: false }));
    view.rerender(section(changed()));
    await waitFor(() => expect(rewriteCalls()).toHaveLength(2));
  });

  test('Update captions after a failure tries again', async () => {
    await saveBatch(batch(sixPosts));
    fetchMock.mockImplementationOnce(async () => errorAnswer());
    fetchMock.mockResolvedValue(rewriteAnswer(sixPosts.map((p) => p.id)));
    await renderSection(changed());
    const update = await screen.findByRole('button', { name: 'Update captions' });
    await waitFor(() => expect((update as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(update);
    await screen.findByText('New post-1.');
    expect(rewriteCalls()).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Update captions' })).toBeNull();
  });

  test('a post the answer drops is not sent again by itself', async () => {
    await saveBatch(batch(sixPosts));
    fetchMock.mockResolvedValue(rewriteAnswer(['post-1', 'post-2', 'post-3', 'post-4', 'post-5']));
    await renderSection(changed());
    await screen.findByText('New post-5.');
    expect(await screen.findByRole('button', { name: 'Update captions' })).toBeTruthy();
    await readyButton();
    expect(rewriteCalls()).toHaveLength(1);
  });

  test('older batches are left alone', async () => {
    const old = {
      ...batch(
        sixPosts.map((p, i) => (i === 0 ? { ...p, edited: true } : p)),
        'stale000',
      ),
      id: 'b0',
      createdAt: '2026-10-25T08:00:00.000Z',
    };
    await saveBatch(old);
    await saveBatch(batch(sixPosts));
    await renderSection();
    await readyButton();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Update captions' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Rewrite this one too' })).toBeNull();
    expect(
      screen.queryByText('Your business details changed since these posts were made.'),
    ).toBeNull();
  });

  test("an older batch's unedited post is checked against today's details", async () => {
    const flagged = { ...sixPosts[0], caption: 'Only 990k.', unchecked: [] };
    await saveBatch({
      ...batch([flagged], 'stale000'),
      id: 'b0',
      createdAt: '2026-10-25T08:00:00.000Z',
    });
    await saveBatch(batch(sixPosts));
    await renderSection();
    const sheet = await openTile(1, 1);
    expect(
      within(sheet).getByText("This price isn't on your website: 990k. Check it before posting."),
    ).toBeTruthy();
  });

  test('no stale line when only edited posts are out of date', async () => {
    await saveBatch(batch(sixPosts.map((p) => ({ ...p, edited: true }))));
    await renderSection(changed());
    const sheet = await openTile(1);
    expect(within(sheet).getByRole('button', { name: 'Rewrite this one too' })).toBeTruthy();
    expect(
      screen.queryByText('Your business details changed since these posts were made.'),
    ).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('rewrite this one too sends one post', async () => {
    await saveBatch(batch(sixPosts.map((p) => ({ ...p, edited: true }))));
    fetchMock.mockResolvedValue(rewriteAnswer(['post-1']));
    await renderSection(changed());
    const sheet = await openTile(1);
    const button = within(sheet).getByRole('button', { name: 'Rewrite this one too' });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button);
    await within(sheet).findByText('New post-1.');
    expect(sentIds(fetchMock.mock.calls[0])).toEqual(['post-1']);
    expect(within(sheet).queryByRole('button', { name: 'Rewrite this one too' })).toBeNull();
  });

  test('edit is disabled while a rewrite runs', async () => {
    await saveBatch(batch(sixPosts));
    let answer: (r: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (answer = resolve)));
    await renderSection(changed());
    await screen.findByText(UPDATING);
    const tile = await screen.findByRole('button', { name: /^Suggestion 1 of 6\b/ });
    fireEvent.click(tile);
    const sheet = await screen.findByRole('dialog');
    const edit = within(sheet).getByRole('button', { name: 'Edit the text' }) as HTMLButtonElement;
    await waitFor(() => expect(edit.disabled).toBe(true));
    answer(rewriteAnswer(sixPosts.map((p) => p.id)));
    await within(sheet).findByText('New post-1.');
    await waitFor(() =>
      expect(
        (within(sheet).getByRole('button', { name: 'Edit the text' }) as HTMLButtonElement)
          .disabled,
      ).toBe(false),
    );
  });

  test("an edited post's flags follow the new details", async () => {
    const flagged = { ...sixPosts[0], caption: 'Only 990k.', edited: true, unchecked: [] };
    await saveBatch(batch([flagged]));
    await renderSection(changed());
    const sheet = await openTile(1, 1);
    expect(
      within(sheet).getByText("This price isn't on your website: 990k. Check it before posting."),
    ).toBeTruthy();
  });
});

describe('editing in the posts section', () => {
  test('a saved edit is kept on the phone', async () => {
    await saveBatch(batch(sixPosts));
    await renderSection();
    await screen.findByText('Caption 6.');
    const sheet = await openTile(1);
    const edit = within(sheet).getByRole('button', { name: 'Edit the text' });
    await waitFor(() => expect((edit as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(edit);
    fireEvent.change(within(sheet).getByLabelText('Caption'), {
      target: { value: 'My own words.' },
    });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    expect(await within(sheet).findByText('My own words.')).toBeTruthy();
    await waitFor(async () => {
      const [saved] = await loadBatches('svarga');
      expect(saved.posts[0]).toMatchObject({ caption: 'My own words.', edited: true });
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('the posts section', () => {
  test('without WhatsApp the button is disabled and says why', async () => {
    const profile = svargaProfile();
    profile.contact.whatsapp = null;
    await renderSection(profile);
    expect((await makeButton()).disabled).toBe(true);
    expect(screen.getByText('Add your WhatsApp number: every post ends with it.')).toBeTruthy();
  });

  test('reads "Make 6 new suggestions" when an attempt is on screen', async () => {
    await saveBatch(batch([post()]));
    await renderSection();
    expect(await screen.findByRole('button', { name: 'Make 6 new suggestions' })).toBeTruthy();
  });

  test('a card shows the caption, call to action and hashtags, never the prompt', async () => {
    await saveBatch(batch([post({ imagePrompt: 'SECRET PROMPT' })]));
    await renderSection();
    const sheet = await openTile(1, 1);
    expect(within(sheet).getByText('Warm oil, slow hands.')).toBeTruthy();
    expect(within(sheet).getByText('Book on WhatsApp: +6281234567890')).toBeTruthy();
    expect(within(sheet).getByText('#canggu #balimassage #aftersurf')).toBeTruthy();
    expect(screen.queryByText('Image description')).toBeNull();
    expect(screen.queryByText(/SECRET PROMPT/)).toBeNull();
  });

  test('a flagged post says what to check', async () => {
    await saveBatch(batch([post({ unchecked: [{ kind: 'price', text: '450k' }] })]));
    await renderSection();
    expect(await screen.findByRole('button', { name: /Check the text$/ })).toBeTruthy();
    const sheet = await openTile(1, 1);
    expect(
      within(sheet).getByText("This price isn't on your website: 450k. Check it before posting."),
    ).toBeTruthy();
  });

  test('a batch made from the current profile does not', async () => {
    await saveBatch(batch([post()]));
    await renderSection();
    await screen.findByText('Warm oil, slow hands.');
    expect(screen.queryByRole('button', { name: 'Update captions' })).toBeNull();
  });

  test('making posts shows the keep-open line, then the cards', async () => {
    let release: (r: Response) => void = () => {};
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => (release = resolve)));
    await renderSection();
    fireEvent.click(await readyButton());
    expect(
      await screen.findByText('Keep this page open for about a minute while your posts are made.'),
    ).toBeTruthy();
    expect((await makeButton()).disabled).toBe(true);
    const p = post({ id: 'post-1' });
    release(
      ndjson([
        { type: 'post', index: 0, post: p },
        {
          type: 'final',
          result: {
            posts: [p],
            dropped: [],
            promptVersion: 'posts-1',
            model: 'm',
            profileHash: profileHash(svargaProfile()),
          },
        },
      ]),
    );
    expect(await screen.findByText('Warm oil, slow hands.')).toBeTruthy();
    expect(await screen.findByText('1 suggestion')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText(/Keep this page open/)).toBeNull());
  });

  test('an error shows its message and gives the button back', async () => {
    fetchMock.mockResolvedValue(ndjson([{ type: 'error', code: 'model_busy' }]));
    await renderSection();
    fireEvent.click(await readyButton());
    expect(
      await screen.findByText("Shopfront has used today's free writing. Try again tomorrow."),
    ).toBeTruthy();
    await waitFor(async () => expect((await makeButton()).disabled).toBe(false));
  });

  test('the button waits while a lost run is being resumed', async () => {
    await saveRun(newPostsRun({ ownerId: 'svarga', step: 'plan' }, new Date(), 'lost'));
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}));
    await saveBrand('svarga', svargaProfile());
    render(section(svargaProfile()));
    const first = screen.getByRole('button', { name: /Make/ }) as HTMLButtonElement;
    expect(first.disabled).toBe(true);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  test('the button spins while the suggestions are being made', async () => {
    let answer: (response: Response) => void = () => {};
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => (answer = resolve)));
    await renderSection();
    const button = await readyButton();
    expect(button.querySelector('.animate-spin')).toBeNull();
    fireEvent.click(button);
    await waitFor(() => expect(button.getAttribute('aria-busy')).toBe('true'));
    expect(button.querySelector('.animate-spin')).not.toBeNull();
    // The plan is asked for a tick after the click: answer it once it has been.
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const p = post({ id: 'post-1' });
    answer(
      ndjson([
        { type: 'post', index: 0, post: p },
        {
          type: 'final',
          result: {
            posts: [p],
            dropped: [],
            promptVersion: 'posts-1',
            model: 'm',
            profileHash: profileHash(svargaProfile()),
          },
        },
      ]),
    );
    expect(await screen.findByText('Warm oil, slow hands.')).toBeTruthy();
    await waitFor(() => expect(button.querySelector('.animate-spin')).toBeNull());
    expect(button.getAttribute('aria-busy')).toBeNull();
  });

  test('a dropped stream clears the cards and asks once more while online', async () => {
    const p = post({ id: 'post-1' });
    const final: PostsLine = {
      type: 'final',
      result: {
        posts: [p],
        dropped: [],
        promptVersion: 'posts-1',
        model: 'm',
        profileHash: profileHash(svargaProfile()),
      },
    };
    fetchMock
      .mockResolvedValueOnce(
        ndjson([{ type: 'post', index: 0, post: post({ id: 'post-1', caption: 'Half.' }) }]),
      )
      .mockResolvedValueOnce(ndjson([{ type: 'post', index: 0, post: p }, final]));
    await renderSection();
    fireEvent.click(await readyButton());
    expect(await screen.findByText('Warm oil, slow hands.')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Half.')).toBeNull();
    await waitFor(async () => expect((await makeButton()).disabled).toBe(false));
  });

  test('a resume that ends after the section closes asks for nothing', async () => {
    const view = await renderSection();
    await makeButton();
    await saveRun(newPostsRun({ ownerId: 'svarga', step: 'plan' }, new Date(), 'lost'));
    document.dispatchEvent(new Event('visibilitychange'));
    view.unmount();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("today's attempts", () => {
  const yesterday = (posts: Post[], hash?: string): PostBatch => ({
    ...batch(posts, hash),
    id: 'y1',
    createdAt: '2026-10-24T09:00:00.000Z',
  });
  const yesterdayPosts = sixPosts.map((p, i) => ({
    ...p,
    caption: `Yesterday ${i + 1}.`,
    topic: `yesterday topic ${i + 1}`,
  }));

  test("yesterday's attempts are not shown and their images are gone", async () => {
    await saveBatch(yesterday(yesterdayPosts));
    await saveImage(image('y1', 'post-1'));
    await saveBatch(batch(sixPosts));
    await renderSection();
    expect(await screen.findByText('Caption 1.')).toBeTruthy();
    expect(screen.queryByText('Yesterday 1.')).toBeNull();
    expect(screen.getAllByRole('heading', { name: /^Attempt/ }).map((h) => h.textContent)).toEqual([
      'Attempt 1',
    ]);
    await waitFor(async () => expect((await loadImages('svarga')).size).toBe(0));
  });

  test('attempts are numbered from the oldest of the day, newest on top', async () => {
    await saveBatch(batch(sixPosts));
    await saveBatch({
      ...batch(sixPosts.map((p) => ({ ...p, caption: `Later ${p.id}.` }))),
      id: 'b2',
      createdAt: '2026-10-25T10:00:00.000Z',
    });
    await renderSection();
    await screen.findByText('Later post-1.');
    expect(screen.getAllByRole('heading', { name: /^Attempt/ }).map((h) => h.textContent)).toEqual([
      'Attempt 2',
      'Attempt 1',
    ]);
    expect(screen.getAllByText('6 suggestions')).toHaveLength(2);
    const text = document.body.textContent ?? '';
    expect(text.indexOf('Later post-1.')).toBeLessThan(text.indexOf('Caption 1.'));
  });

  test('the button and its line', async () => {
    const view = await renderSection();
    expect(await screen.findByRole('button', { name: 'Make 6 suggestions' })).toBeTruthy();
    expect(await screen.findByText(/Each suggestion is the text for a post/)).toBeTruthy();
    expect(screen.queryByText(/stays below/)).toBeNull();
    view.unmount();
    await saveBatch(batch(sixPosts));
    await renderSection();
    expect(await screen.findByRole('button', { name: 'Make 6 new suggestions' })).toBeTruthy();
    expect(await screen.findByText('They go on top. Attempt 1 stays below.')).toBeTruthy();
    expect(screen.queryByText(/Each suggestion is/)).toBeNull();
  });

  test('a new attempt streams in on top', async () => {
    await saveBatch(batch(sixPosts));
    const streamed = post({ id: 'post-1', caption: 'Streaming in.' });
    fetchMock.mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(encodePostsLine({ type: 'post', index: 0, post: streamed })),
            );
          },
        }),
        { headers: { 'content-type': 'application/x-ndjson' } },
      ),
    );
    await renderSection();
    fireEvent.click(await readyButton());
    await screen.findByText('Streaming in.');
    expect(screen.getAllByRole('heading', { name: /^Attempt/ }).map((h) => h.textContent)).toEqual([
      'Attempt 2',
      'Attempt 1',
    ]);
    const text = document.body.textContent ?? '';
    expect(text.indexOf('Streaming in.')).toBeLessThan(text.indexOf('Caption 1.'));
  });

  test('an attempt made after the reset in an app left open is Attempt 1 of the new day', async () => {
    await saveBatch(batch(sixPosts));
    const streamed = post({ id: 'post-1', caption: 'After the reset.' });
    fetchMock.mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(encodePostsLine({ type: 'post', index: 0, post: streamed })),
            );
          },
        }),
        { headers: { 'content-type': 'application/x-ndjson' } },
      ),
    );
    await renderSection();
    const button = await readyButton();
    // The next day, past Google's reset (07:00 UTC), with no reload.
    vi.setSystemTime(new Date('2026-10-26T08:00:00.000Z'));
    fireEvent.click(button);
    await screen.findByText('After the reset.');
    expect(screen.getAllByRole('heading', { name: /^Attempt/ }).map((h) => h.textContent)).toEqual([
      'Attempt 1',
    ]);
    expect(screen.queryByText('Caption 1.')).toBeNull();
  });

  test("recent topics include yesterday's", async () => {
    await saveBatch(yesterday(yesterdayPosts));
    fetchMock.mockReturnValue(new Promise<Response>(() => {}));
    await renderSection();
    fireEvent.click(await readyButton());
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.recent.map((r: { topic: string }) => r.topic)).toContain('yesterday topic 1');
  });

  test("the automatic update leaves yesterday's attempt alone", async () => {
    await saveBatch(yesterday(yesterdayPosts, 'stale000'));
    await renderSection();
    await readyButton();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('the grid and the sheet', () => {
  test('an attempt of six is a grid of six buttons, three to a row, no type labels', async () => {
    await saveBatch(batch(sixPosts));
    await renderSection();
    const grid = await screen.findByTestId('attempt-grid');
    expect(grid.className).toContain('grid-cols-3');
    expect(within(grid).getAllByRole('button')).toHaveLength(6);
    expect(grid.textContent).not.toMatch(/Offer|Moment|Local|Ritual|Tip/);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test("a tile's name: its number, its first words, its state", async () => {
    const posts = sixPosts.map((p, i) =>
      i === 1
        ? { ...p, copiedAt: '2026-10-25T10:00:00.000Z' }
        : i === 2
          ? { ...p, unchecked: [{ kind: 'price' as const, text: '450k' }] }
          : p,
    );
    await saveBatch(batch(posts));
    await renderSection();
    expect(
      await screen.findByRole('button', { name: 'Suggestion 2 of 6, Caption 2., Copied' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Suggestion 3 of 6, Caption 3., Check the text' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Suggestion 1 of 6, Caption 1.' })).toBeTruthy();
  });

  test('an attempt of four says "of 4", in a partial last row', async () => {
    await saveBatch(batch(sixPosts.slice(0, 4)));
    await renderSection();
    expect(await screen.findByRole('button', { name: /^Suggestion 4 of 4\b/ })).toBeTruthy();
    expect(within(screen.getByTestId('attempt-grid')).getAllByRole('button')).toHaveLength(4);
  });

  test('a suggestion streaming in shows as a tile that waits', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                encodePostsLine({ type: 'post', index: 0, post: sixPosts[0] }),
              ),
            );
          },
        }),
        { headers: { 'content-type': 'application/x-ndjson' } },
      ),
    );
    await renderSection();
    fireEvent.click(await readyButton());
    const tile = (await screen.findByRole('button', {
      name: /^Suggestion 1 of 1\b/,
    })) as HTMLButtonElement;
    expect(tile.disabled).toBe(true);
  });

  test('a tile opens its sheet with the text, the links and the step', async () => {
    await saveBatch(batch(sixPosts));
    await renderSection();
    const sheet = await openTile(4);
    expect(screen.getByRole('dialog', { name: 'Attempt 1, suggestion 4 of 6' })).toBe(sheet);
    expect(within(sheet).getByText('Caption 4.')).toBeTruthy();
    expect(within(sheet).getByRole('button', { name: 'Edit the text' })).toBeTruthy();
    expect(within(sheet).getByRole('button', { name: 'Copy the text' })).toBeTruthy();
    expect(within(sheet).queryByText('See the story image')).toBeNull();
  });

  test('closing gives focus back to the tile', async () => {
    await saveBatch(batch(sixPosts));
    await renderSection();
    const sheet = await openTile(2);
    fireEvent.click(within(sheet).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: /^Suggestion 2 of 6\b/ }),
      ),
    );
  });

  test('copying in the sheet ticks the tile "Copied" and keeps it on the phone', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: async () => {} } });
    await saveBatch(batch(sixPosts));
    await renderSection();
    const sheet = await openTile(3);
    fireEvent.click(within(sheet).getByRole('button', { name: 'Copy the text' }));
    fireEvent.click(within(sheet).getByRole('button', { name: 'Close' }));
    expect(
      await screen.findByRole('button', { name: /^Suggestion 3 of 6\b.*Copied$/ }),
    ).toBeTruthy();
    await waitFor(async () => {
      const [saved] = await loadBatches('svarga');
      expect(saved.posts[2].copiedAt).toBeTruthy();
    });
  });

  test('the back gesture closes the sheet', async () => {
    await saveBatch(batch(sixPosts));
    await renderSection();
    await openTile(1);
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  test('a language change keeps the same suggestion open', async () => {
    await saveBatch(batch(sixPosts));
    const view = await renderSection();
    await openTile(4);
    view.rerender(
      <NextIntlClientProvider locale="vi" messages={messagesFor('vi')} timeZone="UTC">
        <PostsSection
          ownerId="svarga"
          profile={svargaProfile()}
          imagesOn={false}
          active
          searching={false}
        />
      </NextIntlClientProvider>,
    );
    expect(await screen.findByRole('dialog', { name: 'Lần thử 1, gợi ý 4/6' })).toBeTruthy();
  });

  test('a new WhatsApp number unticks "Copied" on screen', async () => {
    await saveBatch(batch(sixPosts.map((p) => ({ ...p, copiedAt: '2026-10-25T10:00:00.000Z' }))));
    const profile = svargaProfile();
    profile.contact.whatsapp = { value: '+6289999999999', source: profile.siteUrl };
    await renderSection(profile);
    await screen.findByRole('button', { name: /^Suggestion 1 of 6\b/ });
    await waitFor(() =>
      expect(screen.queryAllByRole('button', { name: /Copied$/ })).toHaveLength(0),
    );
  });

  test('closing gives focus back to the tile of the same attempt', async () => {
    await saveBatch({ ...batch(sixPosts), id: 'b0', createdAt: '2026-10-25T08:00:00.000Z' });
    await saveBatch(batch(sixPosts.map((p) => ({ ...p, caption: `New ${p.id}.` }))));
    await renderSection();
    const newest = (await screen.findAllByRole('button', { name: /^Suggestion 3 of 6\b/ }))[0];
    expect(newest.getAttribute('aria-label')).toContain('New post-3.');
    await waitFor(() => expect((newest as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(newest);
    const sheet = await screen.findByRole('dialog');
    fireEvent.click(within(sheet).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(newest));
  });
});

describe('the special offer on Create Posts', () => {
  const addButton = () => screen.findByRole('button', { name: '+ Special offer' });
  const planBody = () => {
    const call = fetchMock.mock.calls.find((c) => String(c[0]).endsWith('/api/posts/plan'));
    if (!call) throw new Error('no plan request');
    return JSON.parse((call[1] as RequestInit).body as string);
  };

  async function setOffer() {
    fireEvent.click(await addButton());
    const sheet = await screen.findByRole('dialog', { name: 'Special offer' });
    fireEvent.click(within(sheet).getByRole('checkbox', { name: 'Balinese massage' }));
    fireEvent.click(within(sheet).getByRole('button', { name: 'Done' }));
    return screen.findByRole('button', { name: /^10% off · 1 treatment · until Sun 25 Oct$/ });
  }

  test('no offer: the button sits above Make, and the plan has no offer', async () => {
    await renderSection();
    const add = await addButton();
    const make = await readyButton();
    expect(add.compareDocumentPosition(make) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fetchMock.mockResolvedValue(ndjson([{ type: 'error', code: 'model_busy' }]));
    fireEvent.click(make);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect('offer' in planBody()).toBe(false);
  });

  test('Done shows the line, keeps the offer and sends it with the next plan', async () => {
    await renderSection();
    await setOffer();
    expect(screen.queryByRole('button', { name: '+ Special offer' })).toBeNull();
    fetchMock.mockResolvedValue(ndjson([{ type: 'error', code: 'model_busy' }]));
    fireEvent.click(await readyButton());
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(planBody().offer).toMatchObject({
      kind: 'discount',
      percent: 10,
      treatments: ['Balinese massage'],
      until: '2026-10-25',
    });
  });

  test('tapping the line reopens the sheet on its answers', async () => {
    await renderSection();
    fireEvent.click(await setOffer());
    const sheet = await screen.findByRole('dialog', { name: 'Special offer' });
    expect(
      (within(sheet).getByRole('checkbox', { name: 'Balinese massage' }) as HTMLInputElement)
        .checked,
    ).toBe(true);
  });

  test('removing it brings the button back and leaves the suggestions as they are', async () => {
    await saveBatch(batch(sixPosts));
    await renderSection();
    await setOffer();
    fireEvent.click(screen.getByRole('button', { name: 'Remove the offer' }));
    expect(await addButton()).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^Suggestion \d of 6/ })).toHaveLength(6);
  });

  test('the offer is kept on the phone for the day', async () => {
    const view = await renderSection();
    await setOffer();
    view.unmount();
    render(section(svargaProfile()));
    expect(
      await screen.findByRole('button', { name: /^10% off · 1 treatment · until Sun 25 Oct$/ }),
    ).toBeTruthy();
  });

  test('an offer whose last day has passed is gone', async () => {
    const view = await renderSection();
    await setOffer();
    view.unmount();
    vi.setSystemTime(new Date('2026-10-26T12:00:00.000Z'));
    render(section(svargaProfile()));
    expect(await addButton()).toBeTruthy();
  });

  test('the daily reset leaves the offer, and the next attempt carries it', async () => {
    // 05:00 UTC, before Google's reset at 07:00; then past it, the same day.
    vi.setSystemTime(new Date('2026-10-25T05:00:00.000Z'));
    await renderSection();
    await setOffer();
    vi.setSystemTime(new Date('2026-10-25T08:00:00.000Z'));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    fetchMock.mockResolvedValue(ndjson([{ type: 'error', code: 'model_busy' }]));
    fireEvent.click(await readyButton());
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(planBody().offer).toMatchObject({ percent: 10, until: '2026-10-25' });
    expect(
      screen.getByRole('button', { name: /^10% off · 1 treatment · until Sun 25 Oct$/ }),
    ).toBeTruthy();
  });

  test('with the app left open past midnight, the line goes when the page shows again', async () => {
    await renderSection();
    await setOffer();
    vi.setSystemTime(new Date('2026-10-26T12:00:00.000Z'));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(await addButton()).toBeTruthy();
  });

  test('the line follows the screen language', async () => {
    const view = await renderSection();
    await setOffer();
    view.rerender(
      <NextIntlClientProvider locale="vi" messages={messagesFor('vi')} timeZone="UTC">
        <PostsSection
          ownerId="svarga"
          profile={svargaProfile()}
          imagesOn={false}
          active
          searching={false}
        />
      </NextIntlClientProvider>,
    );
    expect(
      await screen.findByRole('button', { name: /^Giảm 10% · 1 liệu trình · đến / }),
    ).toBeTruthy();
  });
});

describe('the offer badge', () => {
  const discount: Offer = {
    kind: 'discount',
    percent: 10,
    treatments: ['Balinese massage'],
    until: '2026-10-27',
    lastDay: 'Tuesday 27 October',
  };
  const withOffer = (offer: Offer): PostBatch => ({
    ...batch(sixPosts.map((p, i) => (i < 2 ? { ...p, offer: true as const } : p))),
    offer,
  });

  test('exactly the two tiles that carry it show "10% off"', async () => {
    await saveBatch(withOffer(discount));
    await renderSection();
    await screen.findAllByRole('button', { name: /^Suggestion \d of 6/ });
    expect(screen.getAllByText('10% off')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /^Suggestion 1 of 6, 10% off,/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Suggestion 3 of 6, Caption/ })).toBeTruthy();
  });

  test('the opened post shows the badge and its last day above the caption', async () => {
    await saveBatch(withOffer(discount));
    await renderSection();
    const sheet = await openTile(1);
    const badge = within(sheet).getByText('10% off');
    const until = within(sheet).getByText('until Tue 27 Oct');
    const caption = within(sheet).getByText('Caption 1.');
    expect(badge.compareDocumentPosition(caption) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(until).toBeTruthy();
  });

  test('a free extra reads "Free extra"', async () => {
    const free: Offer = {
      kind: 'freeExtra',
      gift: 'Balinese massage',
      treatments: ['Balinese massage'],
      until: '2026-10-27',
      lastDay: 'Tuesday 27 October',
    };
    await saveBatch(withOffer(free));
    await renderSection();
    await screen.findAllByRole('button', { name: /^Suggestion \d of 6/ });
    expect(screen.getAllByText('Free extra')).toHaveLength(2);
  });

  test('a batch without an offer has no badge', async () => {
    await saveBatch(batch(sixPosts));
    await renderSection();
    await screen.findAllByRole('button', { name: /^Suggestion \d of 6/ });
    expect(screen.queryByText('10% off')).toBeNull();
  });
});

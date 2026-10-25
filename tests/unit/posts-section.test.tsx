// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { PostsSection } from '@/components/posts/posts-section';
import type { Profile } from '@/lib/brand/profile';
import { resetStoreForTests, saveBrand } from '@/lib/brand/store';
import type { Post, PostBatch } from '@/lib/posts/batch';
import { loadImages, type SavedImage, saveImage } from '@/lib/posts/image-store';
import { profileHash } from '@/lib/posts/input';
import { loadBatches, saveBatch } from '@/lib/posts/store';
import { encodePostsLine, type PostsLine } from '@/lib/posts/stream';
import { newPostsRun } from '@/lib/runs/run-record';
import { saveRun } from '@/lib/runs/store';
import messages from '@/messages/en.json';
import { svargaProfile } from './helpers/brand';
import { post } from './helpers/posts';

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // Today, past 3am: the fixtures' 09:00 attempts are today's.
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
    const edits = screen.getAllByRole('button', { name: 'Edit the text' }) as HTMLButtonElement[];
    expect(edits.every((b) => b.disabled)).toBe(true);
    const rewrite = screen.getByRole('button', {
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
    expect(
      await screen.findByText("This price isn't on your website: 990k. Check it before posting."),
    ).toBeTruthy();
  });

  test('no stale line when only edited posts are out of date', async () => {
    await saveBatch(batch(sixPosts.map((p) => ({ ...p, edited: true }))));
    await renderSection(changed());
    expect(await screen.findAllByRole('button', { name: 'Rewrite this one too' })).toHaveLength(6);
    expect(
      screen.queryByText('Your business details changed since these posts were made.'),
    ).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('rewrite this one too sends one post', async () => {
    await saveBatch(batch(sixPosts.map((p) => ({ ...p, edited: true }))));
    fetchMock.mockResolvedValue(rewriteAnswer(['post-1']));
    await renderSection(changed());
    const [button] = await screen.findAllByRole('button', { name: 'Rewrite this one too' });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button);
    await screen.findByText('New post-1.');
    expect(sentIds(fetchMock.mock.calls[0])).toEqual(['post-1']);
    expect(screen.getAllByRole('button', { name: 'Rewrite this one too' })).toHaveLength(5);
  });

  test('edit is disabled while a rewrite runs', async () => {
    await saveBatch(batch(sixPosts));
    let answer: (r: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (answer = resolve)));
    await renderSection(changed());
    await screen.findByText(UPDATING);
    const edits = (await screen.findAllByRole('button', {
      name: 'Edit the text',
    })) as HTMLButtonElement[];
    await waitFor(() => expect(edits.every((b) => b.disabled)).toBe(true));
    answer(rewriteAnswer(sixPosts.map((p) => p.id)));
    await screen.findByText('New post-1.');
    await waitFor(() =>
      expect(
        (screen.getAllByRole('button', { name: 'Edit the text' }) as HTMLButtonElement[]).every(
          (b) => !b.disabled,
        ),
      ).toBe(true),
    );
  });

  test("an edited post's flags follow the new details", async () => {
    const flagged = { ...sixPosts[0], caption: 'Only 990k.', edited: true, unchecked: [] };
    await saveBatch(batch([flagged]));
    await renderSection(changed());
    expect(
      await screen.findByText("This price isn't on your website: 990k. Check it before posting."),
    ).toBeTruthy();
  });
});

describe('editing in the posts section', () => {
  test('a saved edit is kept on the phone', async () => {
    await saveBatch(batch(sixPosts));
    await renderSection();
    await screen.findByText('Caption 6.');
    const [edit] = await screen.findAllByRole('button', { name: 'Edit the text' });
    await waitFor(() => expect((edit as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(edit);
    fireEvent.change(screen.getByLabelText('Caption'), { target: { value: 'My own words.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('My own words.')).toBeTruthy();
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
    expect(await screen.findByText('Warm oil, slow hands.')).toBeTruthy();
    expect(screen.getByText('Warm oil, slow hands.')).toBeTruthy();
    expect(screen.getByText('Book on WhatsApp: +6281234567890')).toBeTruthy();
    expect(screen.getByText('#canggu #balimassage #aftersurf')).toBeTruthy();
    expect(screen.queryByText('Image description')).toBeNull();
    expect(screen.queryByText(/SECRET PROMPT/)).toBeNull();
  });

  test('a flagged post says what to check', async () => {
    await saveBatch(batch([post({ unchecked: [{ kind: 'price', text: '450k' }] })]));
    await renderSection();
    expect(
      await screen.findByText("This price isn't on your website: 450k. Check it before posting."),
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

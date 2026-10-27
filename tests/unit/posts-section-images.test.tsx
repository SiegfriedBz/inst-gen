// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { PostsSection } from '@/components/posts/posts-section';
import { resetStoreForTests, saveBrand } from '@/lib/brand/store';
import type { Post, PostBatch } from '@/lib/posts/batch';
import { type ImageEvent, resumeImages } from '@/lib/posts/image-client';
import { type SavedImage, saveImage } from '@/lib/posts/image-store';
import { profileHash } from '@/lib/posts/input';
import { loadBatches, saveBatch } from '@/lib/posts/store';
import { encodePostsLine, type PostsLine } from '@/lib/posts/stream';
import messages from '@/messages/en.json';
import { svargaProfile } from './helpers/brand';
import { post } from './helpers/posts';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

type Start = {
  input: { batch: PostBatch; postIds: string[]; hint?: string };
  onEvent: (e: ImageEvent) => void;
};
const started: Start[] = [];
let release: () => void = () => {};
const resumeCalls: { resolve: (v: null) => void }[] = [];
let holdResume = false;

vi.mock('@/lib/posts/image-client', () => ({
  startImages: vi.fn((input: Start['input'], onEvent: Start['onEvent']) => {
    started.push({ input, onEvent });
    return { stop: vi.fn(), done: new Promise<void>((resolve) => (release = resolve)) };
  }),
  resumeImages: vi.fn(
    () =>
      new Promise<null>((resolve) => {
        resumeCalls.push({ resolve });
        if (!holdResume) resolve(null);
      }),
  ),
}));

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // Today, past the reset (07:00 UTC): the fixtures' 09:00 attempts are today's.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-25T12:00:00.000Z'));
  vi.mocked(resumeImages).mockClear();
  globalThis.indexedDB = new IDBFactory();
  resetStoreForTests();
  started.length = 0;
  resumeCalls.length = 0;
  holdResume = false;
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal(
    'URL',
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() }),
  );
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.unstubAllGlobals();
});

const profile = svargaProfile();
const six = Array.from({ length: 6 }, (_, i) =>
  post({ id: `post-${i + 1}`, altText: `Alt ${i + 1}`, caption: `Caption ${i + 1}.` }),
);

function batch(posts: Post[], hash = profileHash(profile)): PostBatch {
  return {
    id: 'b1',
    ownerId: 'svarga',
    createdAt: '2026-10-25T09:00:00.000Z',
    profileReadAt: '2026-10-24T09:00:00.000Z',
    profileHash: hash,
    promptVersion: 'posts-1',
    model: 'm',
    posts,
    dropped: [],
  };
}

function image(postId: string): SavedImage {
  return {
    postId,
    batchId: 'b1',
    ownerId: 'svarga',
    story: new Blob(['s'], { type: 'image/jpeg' }),
    post: new Blob(['p'], { type: 'image/jpeg' }),
    imagePrompt: 'A villa deck at dusk',
    model: 'm',
    promptVersion: 'images-1',
    createdAt: '2026-10-25T10:00:00.000Z',
  };
}

const planAnswer = (posts: Post[]) =>
  new Response(
    [
      ...posts.map((p, index): PostsLine => ({ type: 'post', index, post: p })),
      {
        type: 'final',
        result: {
          posts,
          dropped: [],
          promptVersion: 'posts-1',
          model: 'm',
          profileHash: profileHash(profile),
        },
      } satisfies PostsLine,
    ]
      .map(encodePostsLine)
      .join(''),
    { headers: { 'content-type': 'application/x-ndjson' } },
  );

async function renderSection(imagesOn = true) {
  await saveBrand('svarga', profile);
  return render(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
      <PostsSection
        ownerId="svarga"
        profile={profile}
        imagesOn={imagesOn}
        active
        searching={false}
      />
    </NextIntlClientProvider>,
  );
}

const makePosts = async () => {
  const button = (await screen.findByRole('button', {
    name: /Make 6 (new )?suggestions/,
  })) as HTMLButtonElement;
  await waitFor(() => expect(button.disabled).toBe(false));
  return button;
};

// Opens suggestion n of six and returns its sheet.
async function openTile(n: number): Promise<HTMLElement> {
  const name = new RegExp(`^Suggestion ${n} of 6\\b`);
  // Found again each time: the tiles of a streaming attempt are replaced
  // once it's kept.
  await waitFor(() =>
    expect((screen.getByRole('button', { name }) as HTMLButtonElement).disabled).toBe(false),
  );
  fireEvent.click(screen.getByRole('button', { name }));
  return screen.findByRole('dialog');
}

describe('a suggestion with its images', () => {
  test('an opened suggestion with its image can be copied and saved; one without waits', async () => {
    await saveBatch(batch(six));
    await saveImage(image('post-1'));
    await renderSection();
    let sheet = await openTile(1);
    expect(within(sheet).getByRole('button', { name: /Copy the text/ })).toBeTruthy();
    const save = within(sheet).getByRole('button', {
      name: /Save the 2 images/,
    }) as HTMLButtonElement;
    await waitFor(() => expect(save.disabled).toBe(false));
    fireEvent.click(within(sheet).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    sheet = await openTile(2);
    expect(
      (within(sheet).getByRole('button', { name: /Save the 2 images/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.queryByText('Your feed once these are posted')).toBeNull();
  });

  test('save then copy, close: the tile says "Saved and copied", kept after a reload', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      userAgent: IPHONE,
      canShare: () => true,
      share: async () => {},
      clipboard: { writeText: async () => {} },
    });
    await saveBatch(batch(six));
    await saveImage(image('post-1'));
    const view = await renderSection();
    const sheet = await openTile(1);
    const save = within(sheet).getByRole('button', { name: /Save the 2 images/ });
    await waitFor(() => expect((save as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(save);
    fireEvent.click(within(sheet).getByRole('button', { name: /Copy the text/ }));
    fireEvent.click(within(sheet).getByRole('button', { name: 'Close' }));
    expect(
      await screen.findByRole('button', { name: /^Suggestion 1 of 6\b.*Saved and copied$/ }),
    ).toBeTruthy();
    await waitFor(async () => {
      const [saved] = await loadBatches('svarga');
      expect(saved.posts[0].savedAt).toBeTruthy();
      expect(saved.posts[0].copiedAt).toBeTruthy();
    });
    view.unmount();
    await renderSection();
    expect(
      await screen.findByRole('button', { name: /^Suggestion 1 of 6\b.*Saved and copied$/ }),
    ).toBeTruthy();
  });

  test('Create new image carries the hint', async () => {
    await saveBatch(batch(six));
    await saveImage(image('post-1'));
    await renderSection();
    const sheet = await openTile(1);
    const button = within(sheet).getByRole('button', { name: 'Create new image' });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button);
    fireEvent.change(within(sheet).getByLabelText('What should change? (optional)'), {
      target: { value: 'more green' },
    });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Make it' }));
    expect(started.at(-1)?.input).toMatchObject({ postIds: ['post-1'], hint: 'more green' });
    expect(within(sheet).getByText('Making the image…')).toBeTruthy();
  });

  test('images for a cleared attempt are not saved', async () => {
    await saveBatch({ ...batch(six), id: 'y1', createdAt: '2026-10-24T09:00:00.000Z' });
    await saveBatch(batch(six));
    await renderSection();
    await waitFor(() => expect(vi.mocked(resumeImages)).toHaveBeenCalled());
    const passed = vi.mocked(resumeImages).mock.calls.at(-1)?.[1] as PostBatch[];
    expect(passed.map((b) => b.id)).toEqual(['b1']);
  });
});

describe('images in the posts section', () => {
  test("one batch's image doesn't show on another batch", async () => {
    await saveBatch({ ...batch(six), id: 'a', createdAt: '2026-10-25T08:00:00.000Z' });
    await saveBatch({ ...batch(six), id: 'b' });
    await saveImage({ ...image('post-1'), batchId: 'a' });
    await renderSection();
    await screen.findAllByRole('img');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getAllByRole('img')).toHaveLength(1);
  });

  test('a saved plan starts its six images', async () => {
    fetchMock.mockResolvedValue(planAnswer(six));
    await renderSection();
    fireEvent.click(await makePosts());
    await waitFor(() => expect(started).toHaveLength(1));
    expect(started[0].input.postIds).toEqual(six.map((p) => p.id));
    expect(await screen.findAllByText('Making the image…')).toHaveLength(6);
    expect(screen.queryByRole('button', { name: 'Make the images' })).toBeNull();
  });

  test('images arrive on their cards, and a failure says why', async () => {
    fetchMock.mockResolvedValue(planAnswer(six));
    await renderSection();
    fireEvent.click(await makePosts());
    await waitFor(() => expect(started).toHaveLength(1));
    const batchId = started[0].input.batch.id;
    started[0].onEvent({ type: 'image', image: { ...image('post-1'), batchId } });
    started[0].onEvent({ type: 'error', batchId, postId: 'post-2', code: 'image_blocked' });
    expect(await screen.findByRole('img', { name: 'Alt 1' })).toBeTruthy();
    expect(screen.getByText("This image couldn't be made. Try again for a new one.")).toBeTruthy();
    const sheet = await openTile(2);
    fireEvent.click(within(sheet).getByRole('button', { name: 'Try again' }));
    expect(started[1].input.postIds).toEqual(['post-2']);
  });

  test('Make my posts stays disabled while images are made', async () => {
    fetchMock.mockResolvedValue(planAnswer(six));
    await renderSection();
    fireEvent.click(await makePosts());
    await waitFor(() => expect(started).toHaveLength(1));
    const more = (await screen.findByRole('button', {
      name: 'Make 6 new suggestions',
    })) as HTMLButtonElement;
    expect(more.disabled).toBe(true);
    expect(
      screen.getByText('Keep this page open for about a minute while your posts are made.'),
    ).toBeTruthy();
    const batchId = started[0].input.batch.id;
    for (const p of six) {
      started[0].onEvent({ type: 'image', image: { ...image(p.id), batchId } });
    }
    release();
    await waitFor(() => expect(more.disabled).toBe(false));
  });

  test('edit can be tapped while images are made', async () => {
    fetchMock.mockResolvedValue(planAnswer(six));
    await renderSection();
    fireEvent.click(await makePosts());
    await waitFor(() => expect(started).toHaveLength(1));
    const more = (await screen.findByRole('button', {
      name: 'Make 6 new suggestions',
    })) as HTMLButtonElement;
    expect(more.disabled).toBe(true);
    const sheet = await openTile(1);
    const edit = within(sheet).getByRole('button', { name: 'Edit the text' }) as HTMLButtonElement;
    await waitFor(() => expect(edit.disabled).toBe(false));
  });

  test('a rewrite starts no image', async () => {
    await saveBatch(batch(six, 'stale000'));
    for (const p of six) await saveImage(image(p.id));
    fetchMock.mockResolvedValue(planAnswer(six));
    await renderSection();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.queryByText('Updating your captions to match your business…')).toBeNull(),
    );
    expect(started).toHaveLength(0);
    expect(screen.getAllByRole('img')).toHaveLength(6);
  });

  test('an old batch shows Make the images', async () => {
    await saveBatch(batch(six));
    await renderSection();
    const button = await screen.findByRole('button', { name: 'Make the images' });
    fireEvent.click(button);
    expect(started[0].input.postIds).toEqual(six.map((p) => p.id));
  });

  test('Make the images waits while lost images are looked up', async () => {
    await saveBatch(batch(six));
    holdResume = true;
    await renderSection();
    const button = (await screen.findByRole('button', {
      name: 'Make the images',
    })) as HTMLButtonElement;
    await waitFor(() => expect(resumeCalls.length).toBeGreaterThan(0));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(button.disabled).toBe(true);
    for (const call of resumeCalls) call.resolve(null);
    await waitFor(() => expect(button.disabled).toBe(false));
  });

  test('a dropped image is asked for again while the phone is online', async () => {
    fetchMock.mockResolvedValue(planAnswer(six));
    await renderSection();
    fireEvent.click(await makePosts());
    await waitFor(() => expect(started).toHaveLength(1));
    const before = resumeCalls.length;
    const batchId = started[0].input.batch.id;
    started[0].onEvent({ type: 'offline', batchId, postId: 'post-1' });
    for (const p of six.slice(1)) {
      started[0].onEvent({ type: 'image', image: { ...image(p.id), batchId } });
    }
    release();
    await waitFor(() => expect(resumeCalls.length).toBeGreaterThan(before));
  });

  test('images off: no request, text tiles, the off line in the opened suggestion', async () => {
    fetchMock.mockResolvedValue(planAnswer(six));
    await renderSection(false);
    fireEvent.click(await makePosts());
    await screen.findByRole('button', { name: /^Suggestion 6 of 6\b/ });
    expect(screen.queryAllByRole('img')).toHaveLength(0);
    const sheet = await openTile(1);
    expect(within(sheet).getByText("Images aren't turned on for your account yet.")).toBeTruthy();
    expect(started).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Make the images' })).toBeNull();
  });

  test('images paused: a text tile, ticked "Copied" once its text is copied', async () => {
    await saveBatch(
      batch(six.map((p, i) => (i === 0 ? { ...p, copiedAt: '2026-10-25T10:30:00.000Z' } : p))),
    );
    await renderSection();
    fireEvent.click(await screen.findByRole('button', { name: 'Make the images' }));
    await waitFor(() => expect(started).toHaveLength(1));
    started[0].onEvent({ type: 'error', batchId: 'b1', postId: 'post-1', code: 'images_paused' });
    expect(
      await screen.findByRole('button', { name: /^Suggestion 1 of 6\b.*Copied$/ }),
    ).toBeTruthy();
  });
});

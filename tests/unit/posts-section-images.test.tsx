// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { PostsSection } from '@/components/posts/posts-section';
import { resetStoreForTests, saveBrand } from '@/lib/brand/store';
import type { Post, PostBatch } from '@/lib/posts/batch';
import { type ImageEvent, resumeImages } from '@/lib/posts/image-client';
import { type SavedImage, saveImage } from '@/lib/posts/image-store';
import { profileHash } from '@/lib/posts/input';
import { saveBatch } from '@/lib/posts/store';
import { encodePostsLine, type PostsLine } from '@/lib/posts/stream';
import messages from '@/messages/en.json';
import { svargaProfile } from './helpers/brand';
import { post } from './helpers/posts';

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
  // Today, past 3am: the fixtures' 09:00 attempts are today's.
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

describe('a suggestion with its images', () => {
  test('a card with its image can be copied and saved', async () => {
    await saveBatch(batch(six));
    await saveImage(image('post-1'));
    await renderSection();
    expect(await screen.findAllByRole('button', { name: 'Copy the text' })).toHaveLength(6);
    const saves = (await screen.findAllByRole('button', {
      name: 'Save the 2 images',
    })) as HTMLButtonElement[];
    expect(saves).toHaveLength(6);
    await waitFor(() => expect(saves.filter((b) => !b.disabled)).toHaveLength(1));
    expect(screen.queryByText('Your feed once these are posted')).toBeNull();
  });

  test('Create new image carries the hint', async () => {
    await saveBatch(batch(six));
    await saveImage(image('post-1'));
    await renderSection();
    const button = await screen.findByRole('button', { name: 'Create new image' });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button);
    fireEvent.change(screen.getByLabelText('What should change? (optional)'), {
      target: { value: 'more green' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Make it' }));
    expect(started.at(-1)?.input).toMatchObject({ postIds: ['post-1'], hint: 'more green' });
    expect(screen.getByText('Making the image…')).toBeTruthy();
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
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
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
    const edits = (await screen.findAllByRole('button', {
      name: 'Edit the text',
    })) as HTMLButtonElement[];
    expect(edits).toHaveLength(6);
    await waitFor(() => expect(edits.every((b) => !b.disabled)).toBe(true));
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

  test('images off: no request, the off line on every card', async () => {
    fetchMock.mockResolvedValue(planAnswer(six));
    await renderSection(false);
    fireEvent.click(await makePosts());
    expect(
      await screen.findAllByText("Images aren't turned on for your account yet."),
    ).toHaveLength(6);
    expect(started).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Make the images' })).toBeNull();
  });
});

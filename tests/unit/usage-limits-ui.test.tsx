// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { BrandHome } from '@/components/brand/brand-home';
import { CaptionTranslation } from '@/components/posts/caption-translation';
import { PostsSection } from '@/components/posts/posts-section';
import { ReviewsSection } from '@/components/reviews/reviews-section';
import { UsageProvider } from '@/components/usage/usage-provider';
import { resetStoreForTests, saveBrand } from '@/lib/brand/store';
import type { Post, PostBatch } from '@/lib/posts/batch';
import { startImages } from '@/lib/posts/image-client';
import { type SavedImage, saveImage } from '@/lib/posts/image-store';
import { profileHash } from '@/lib/posts/input';
import { saveBatch } from '@/lib/posts/store';
import { newPostsRun } from '@/lib/runs/run-record';
import { saveRun } from '@/lib/runs/store';
import type { UsageAnswer } from '@/lib/usage/answer';
import { USAGE_EVENT } from '@/lib/usage/client';
import messages from '@/messages/en.json';
import { senProfile, svargaProfile } from './helpers/brand';
import { post } from './helpers/posts';

// At a limit, each tab says when it comes back
// (docs/specs/platform/usage-counters, "At a limit"). The phone is in Da
// Nang: Pacific midnight on 26 October (summer time) is 14:00 there.

const zone = process.env.TZ;
process.env.TZ = 'Asia/Ho_Chi_Minh';
afterAll(() => {
  if (zone === undefined) delete process.env.TZ;
  else process.env.TZ = zone;
});

const allLeft = { reads: 3, attempts: 3, newImages: 10, replies: 20 };
const full: UsageAnswer = {
  resetsAt: '2026-10-26T07:00:00.000Z',
  limited: true,
  left: allLeft,
  limits: { reads: 3, attempts: 3, newImages: 10, replies: 20 },
  poolEmpty: false,
  images: { on: true, monthFull: false, backAt: '2026-11-01T00:00:00.000Z' },
};

let fetchMock: ReturnType<typeof vi.fn>;
let usage: UsageAnswer;
let other: (url: string, init?: RequestInit) => Promise<Response>;
const usageReads = () => fetchMock.mock.calls.filter((c) => c[0] === '/api/usage').length;
const sent = (path: string) => fetchMock.mock.calls.filter((c) => c[0] === path);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-25T12:00:00.000Z'));
  globalThis.indexedDB = new IDBFactory();
  resetStoreForTests();
  usage = full;
  other = () => new Promise<Response>(() => {});
  fetchMock = vi.fn(async (url: string, init?: RequestInit) =>
    url === '/api/usage' ? Response.json(usage) : other(url, init),
  );
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

const left = (over: Partial<typeof allLeft>) => ({ ...full, left: { ...allLeft, ...over } });

function shown(node: ReactNode, locale = 'en') {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <UsageProvider>{node}</UsageProvider>
    </NextIntlClientProvider>,
  );
}

const refused = (code: string) =>
  Response.json({ error: code, resetsAt: full.resetsAt }, { status: 429 });

function batch(posts: Post[], hash = profileHash(svargaProfile())): PostBatch {
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

async function posts(imagesOn = false) {
  await saveBrand('svarga', svargaProfile());
  return shown(
    <PostsSection
      ownerId="svarga"
      profile={svargaProfile()}
      imagesOn={imagesOn}
      active
      searching={false}
    />,
  );
}

const makeButton = async () =>
  (await screen.findByRole('button', { name: /Make 6 (new )?suggestions/ })) as HTMLButtonElement;

describe('Create Posts', () => {
  test('no attempt left: the button is off and says when', async () => {
    usage = left({ attempts: 0 });
    await posts();
    expect(await screen.findByText("You've made today's 3 attempts. More at 14:00.")).toBeTruthy();
    expect((await makeButton()).disabled).toBe(true);
  });

  test('a 429 while the bar says 1 left shows the line and reads the bar again', async () => {
    usage = left({ attempts: 1 });
    other = async () => refused('limit_reached');
    await posts();
    const button = await makeButton();
    await waitFor(() => expect(button.disabled).toBe(false));
    const before = usageReads();
    fireEvent.click(button);
    expect(await screen.findByText("You've made today's 3 attempts. More at 14:00.")).toBeTruthy();
    await waitFor(() => expect(usageReads()).toBeGreaterThan(before));
  });

  test('a resumed plan answered 429 ends on the line', async () => {
    await saveRun(newPostsRun({ ownerId: 'svarga', step: 'plan' }, new Date(), 'lost'));
    other = async () => refused('limit_reached');
    await posts();
    expect(await screen.findByText("You've made today's 3 attempts. More at 14:00.")).toBeTruthy();
    await waitFor(async () => expect(screen.queryByText(/Keep this page open/)).toBeNull());
  });

  test("the caption update at its day's limit", async () => {
    await saveBatch(batch([post({ id: 'post-1' })], 'older-hash'));
    other = async (url) => (url === '/api/posts/rewrite' ? refused('limit_reached') : refused('x'));
    await posts();
    expect(
      await screen.findByText('Captions were updated 5 times today. Again at 14:00.'),
    ).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Update captions' })).toBeTruthy();
  });

  test('the image month full: no image asked for, the card says until when', async () => {
    usage = { ...full, images: { ...full.images, monthFull: true } };
    await saveBatch(batch([post({ id: 'post-1' })]));
    await posts(true);
    expect(await screen.findByText('No new images until November 1.')).toBeTruthy();
    expect(sent('/api/posts/image')).toHaveLength(0);
  });

  test('no new image left: "Create new image" is off', async () => {
    usage = left({ newImages: 0 });
    await saveBatch(batch([post({ id: 'post-1' })]));
    await saveImage(image('post-1'));
    await posts(true);
    fireEvent.click(await screen.findByRole('button', { name: /^Suggestion 1 of 1\b/ }));
    const link = (await screen.findByRole('button', {
      name: 'Create new image',
    })) as HTMLButtonElement;
    await waitFor(() => expect(link.disabled).toBe(true));
    expect(screen.getByText("You've made today's 10 new images. More at 14:00.")).toBeTruthy();
  });
});

describe('images say which are first', () => {
  test('first for a post with no image yet, not for one with an image', async () => {
    const b = batch([post({ id: 'post-1' }), post({ id: 'post-2' })]);
    await saveImage(image('post-1'));
    other = async () => new Response(null, { status: 502 });
    const run = startImages(
      { ownerId: 'svarga', batch: b, postIds: ['post-1', 'post-2'] },
      () => {},
    );
    await run.done;
    const bodies = sent('/api/posts/image').map((c) => JSON.parse(String(c[1]?.body)));
    expect(bodies.find((b) => b.postId === 'post-1')?.first).toBe(false);
    expect(bodies.find((b) => b.postId === 'post-2')?.first).toBe(true);
  });
});

describe('the translation', () => {
  test("at its day's limit", async () => {
    other = async () => refused('limit_reached');
    shown(
      <CaptionTranslation ownerId="svarga" batchId="b1" postId="post-1" caption="Warm oil." />,
      'vi',
    );
    fireEvent.click(await screen.findByRole('button'));
    expect(
      await screen.findByText("Today's 30 translations are used up. More at 14:00."),
    ).toBeTruthy();
  });
});

describe('Reviews', () => {
  const reviews = () => shown(<ReviewsSection ownerId="sen" profile={senProfile()} active />);

  test('no reply left: the button is off and says when', async () => {
    usage = left({ replies: 0 });
    reviews();
    expect(
      await screen.findByText("You've written today's 20 replies. More at 14:00."),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText('The review'), { target: { value: 'Lovely.' } });
    expect(
      (screen.getByRole('button', { name: 'Write 2 replies' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  test('the pool empty stops writing', async () => {
    usage = { ...full, poolEmpty: true };
    reviews();
    expect(
      await screen.findByText("Shopfront has used today's free writing. Back at 14:00."),
    ).toBeTruthy();
  });

  test('a 429 from the server shows the line and fires a usage event', async () => {
    other = async () => refused('limit_reached');
    const events = vi.fn();
    window.addEventListener(USAGE_EVENT, events);
    reviews();
    fireEvent.change(await screen.findByLabelText('The review'), { target: { value: 'Lovely.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Write 2 replies' }));
    expect(
      await screen.findByText("You've written today's 20 replies. More at 14:00."),
    ).toBeTruthy();
    expect(events).toHaveBeenCalled();
    window.removeEventListener(USAGE_EVENT, events);
  });
});

describe('Your business', () => {
  test('no read left: "Re-read my website" is off and says when', async () => {
    usage = left({ reads: 0 });
    await saveBrand('svarga', { ...svargaProfile(), searchedAt: '2026-10-24T09:30:00.000Z' });
    shown(<BrandHome ownerId="svarga" name="Svarga" imagesOn={false} />);
    const reread = (await screen.findByRole('button', {
      name: 'Re-read my website',
      hidden: true,
    })) as HTMLButtonElement;
    await waitFor(() => expect(reread.disabled).toBe(true));
    expect(
      screen.getByText("You've read your website 3 times today. Again at 14:00.", { exact: true }),
    ).toBeTruthy();
  });
});

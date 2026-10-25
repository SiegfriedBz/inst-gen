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
import { profileHash } from '@/lib/posts/input';
import { saveBatch } from '@/lib/posts/store';
import { encodePostsLine, type PostsLine } from '@/lib/posts/stream';
import { newPostsRun } from '@/lib/runs/run-record';
import { saveRun } from '@/lib/runs/store';
import messages from '@/messages/en.json';
import { svargaProfile } from './helpers/brand';
import { post } from './helpers/posts';

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

async function renderSection(profile: Profile = svargaProfile()) {
  await saveBrand('svarga', profile);
  return render(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
      <PostsSection ownerId="svarga" profile={profile} imagesOn={false} />
    </NextIntlClientProvider>,
  );
}

// The button, once the first look for a lost run has ended.
async function readyButton(): Promise<HTMLButtonElement> {
  const button = await makeButton();
  await waitFor(() => expect(button.disabled).toBe(false));
  return button;
}

const makeButton = async () =>
  (await screen.findByRole('button', { name: /Make/ })) as HTMLButtonElement;

describe('the posts section', () => {
  test('without WhatsApp the button is disabled and says why', async () => {
    const profile = svargaProfile();
    profile.contact.whatsapp = null;
    await renderSection(profile);
    expect((await makeButton()).disabled).toBe(true);
    expect(screen.getByText('Add your WhatsApp number: every post ends with it.')).toBeTruthy();
  });

  test('reads "Make 6 more" when a batch exists', async () => {
    await saveBatch(batch([post()]));
    await renderSection();
    expect(await screen.findByRole('button', { name: 'Make 6 more' })).toBeTruthy();
  });

  test('a card shows the label, caption, call to action, hashtags and image description, never the prompt', async () => {
    await saveBatch(batch([post({ imagePrompt: 'SECRET PROMPT' })]));
    await renderSection();
    expect(await screen.findByText('Offer')).toBeTruthy();
    expect(screen.getByText('Warm oil, slow hands.')).toBeTruthy();
    expect(screen.getByText('Book on WhatsApp: +6281234567890')).toBeTruthy();
    expect(screen.getByText('#canggu #balimassage #aftersurf')).toBeTruthy();
    expect(screen.getByText('Image description')).toBeTruthy();
    expect(screen.queryByText(/SECRET PROMPT/)).toBeNull();
  });

  test('a flagged post says what to check', async () => {
    await saveBatch(batch([post({ unchecked: [{ kind: 'price', text: '450k' }] })]));
    await renderSection();
    expect(await screen.findByText('Check before posting:')).toBeTruthy();
    expect(screen.getByText('450k is not on your site')).toBeTruthy();
  });

  test('a stale batch offers to update its captions', async () => {
    await saveBatch(batch([post()], 'stale000'));
    await renderSection();
    expect(
      await screen.findByText('Your business details changed since these posts were made.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Update captions' })).toBeTruthy();
  });

  test('a batch made from the current profile does not', async () => {
    await saveBatch(batch([post()]));
    await renderSection();
    await screen.findByText('Offer');
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
    expect(await screen.findByText('We made 1 posts this time.')).toBeTruthy();
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
    render(
      <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
        <PostsSection ownerId="svarga" profile={svargaProfile()} imagesOn={false} />
      </NextIntlClientProvider>,
    );
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

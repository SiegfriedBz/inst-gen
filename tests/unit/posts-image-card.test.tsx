// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { type ImageState, PostImage } from '@/components/posts/post-image';
import type { SavedImage } from '@/lib/posts/image-store';
import messages from '@/messages/en.json';

beforeEach(() => {
  let n = 0;
  vi.stubGlobal(
    'URL',
    Object.assign(URL, {
      createObjectURL: vi.fn(() => `blob:test-${++n}`),
      revokeObjectURL: vi.fn(),
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const saved: SavedImage = {
  postId: 'post-1',
  batchId: 'b1',
  ownerId: 'sen',
  story: new Blob(['story'], { type: 'image/jpeg' }),
  post: new Blob(['post'], { type: 'image/jpeg' }),
  imagePrompt: 'Oil at dusk',
  model: 'gemini-nano-banana-2.1',
  promptVersion: 'images-1',
  createdAt: '2026-10-25T10:00:00.000Z',
};

const ALT = 'Hands pressing warm oil into shoulders on a villa deck at dusk';

function show(state: ImageState, onRetry?: () => void) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
      <PostImage state={state} altText={ALT} onRetry={onRetry} />
    </NextIntlClientProvider>,
  );
}

describe('a post image', () => {
  test('making shows the placeholder', () => {
    show({ kind: 'making' });
    expect(screen.getByText('Making the image…')).toBeTruthy();
  });

  test('ready shows the post crop with its alt text, and the story on tap', async () => {
    show({ kind: 'ready', image: saved });
    const img = screen.getByRole('img', { name: ALT }) as HTMLImageElement;
    expect(img.src).toBe('blob:test-1');
    fireEvent.click(screen.getByRole('button', { name: 'See the story' }));
    const dialog = await screen.findByRole('dialog');
    const story = dialog.querySelector('img') as HTMLImageElement;
    expect(story.src).toBe('blob:test-2');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('the object URLs are revoked when the card goes', () => {
    const { unmount } = show({ kind: 'ready', image: saved });
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-1');
  });

  test('failed shows its message and Try again', () => {
    const retry = vi.fn();
    show({ kind: 'failed', code: 'image_blocked' }, retry);
    expect(screen.getByText("This image couldn't be made. Try again for a new one.")).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  test('offline says it carries on, with no Try again', () => {
    show({ kind: 'failed', code: 'offline' }, vi.fn());
    expect(
      screen.getByText("You're offline. Your images will carry on when you're back."),
    ).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('images_off shows the off line and no button', () => {
    show({ kind: 'failed', code: 'images_off' }, vi.fn());
    expect(screen.getByText("Images aren't turned on for your account yet.")).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('off shows the off line', () => {
    show({ kind: 'off' });
    expect(screen.getByText("Images aren't turned on for your account yet.")).toBeTruthy();
  });

  test('none shows Try again only when it can retry', () => {
    const { unmount } = show({ kind: 'none' });
    expect(screen.queryByRole('button')).toBeNull();
    unmount();
    show({ kind: 'none' }, vi.fn());
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });
});

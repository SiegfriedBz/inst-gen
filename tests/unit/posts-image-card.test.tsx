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

function show(state: ImageState, onRetry?: () => void, onNewImage?: (hint: string) => void) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
      <PostImage state={state} altText={ALT} onRetry={onRetry} onNewImage={onNewImage} />
    </NextIntlClientProvider>,
  );
}

describe('a new image', () => {
  test('the form sends the hint', () => {
    const onNewImage = vi.fn();
    show({ kind: 'ready', image: saved }, undefined, onNewImage);
    fireEvent.click(screen.getByRole('button', { name: 'New image' }));
    const hint = screen.getByLabelText('What should change? (optional)') as HTMLInputElement;
    expect(hint.maxLength).toBe(60);
    expect(hint.placeholder).toBe('more green, a sunset balcony');
    fireEvent.change(hint, { target: { value: 'more green' } });
    fireEvent.click(screen.getByRole('button', { name: 'Make it' }));
    expect(onNewImage).toHaveBeenCalledWith('more green');
    expect(screen.queryByLabelText('What should change? (optional)')).toBeNull();
  });

  test('cancel closes the form', () => {
    const onNewImage = vi.fn();
    show({ kind: 'ready', image: saved }, undefined, onNewImage);
    fireEvent.click(screen.getByRole('button', { name: 'New image' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onNewImage).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('What should change? (optional)')).toBeNull();
  });

  test('the old image stays dimmed while a new one is made', () => {
    show({ kind: 'ready', image: saved, making: true }, undefined, vi.fn());
    expect(screen.getByRole('img', { name: ALT })).toBeTruthy();
    expect(screen.getByText('Making the image…')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'New image' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  test('a failed new image keeps the old one and shows the error', () => {
    show({ kind: 'ready', image: saved, failure: 'image_blocked' }, undefined, vi.fn());
    expect(screen.getByRole('img', { name: ALT })).toBeTruthy();
    expect(screen.getByText("This image couldn't be made. Try again for a new one.")).toBeTruthy();
  });

  test('a failed image offers a new one too', () => {
    show({ kind: 'failed', code: 'image_blocked' }, vi.fn(), vi.fn());
    expect(screen.getByRole('button', { name: 'New image' })).toBeTruthy();
  });

  test('no New image without a handler', () => {
    show({ kind: 'ready', image: saved });
    expect(screen.queryByRole('button', { name: 'New image' })).toBeNull();
  });
});

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

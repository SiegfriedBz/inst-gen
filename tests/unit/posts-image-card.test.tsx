// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { type ImageState, NewImageLink, PostImage, StoryLink } from '@/components/posts/post-image';
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

const wrap = (node: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
      {node}
    </NextIntlClientProvider>,
  );

function show(state: ImageState, onRetry?: () => void) {
  return wrap(<PostImage state={state} altText={ALT} onRetry={onRetry} />);
}

const newImage = (onMake: (hint: string) => void, disabled = false) =>
  wrap(<NewImageLink onMake={onMake} disabled={disabled} />);

describe('Create new image', () => {
  test('the form sends the hint', () => {
    const onMake = vi.fn();
    newImage(onMake);
    fireEvent.click(screen.getByRole('button', { name: 'Create new image' }));
    const hint = screen.getByLabelText('What should change? (optional)') as HTMLInputElement;
    expect(hint.maxLength).toBe(60);
    expect(hint.placeholder).toBe('more green, a sunset balcony');
    fireEvent.change(hint, { target: { value: 'more green' } });
    fireEvent.click(screen.getByRole('button', { name: 'Make it' }));
    expect(onMake).toHaveBeenCalledWith('more green');
    expect(screen.queryByLabelText('What should change? (optional)')).toBeNull();
  });

  test('cancel closes the form', () => {
    const onMake = vi.fn();
    newImage(onMake);
    fireEvent.click(screen.getByRole('button', { name: 'Create new image' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onMake).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('What should change? (optional)')).toBeNull();
  });

  test('disabled while a new image is made', () => {
    newImage(vi.fn(), true);
    expect(
      (screen.getByRole('button', { name: 'Create new image' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  test('the old image stays dimmed while a new one is made', () => {
    show({ kind: 'ready', image: saved, making: true });
    expect(screen.getByRole('img', { name: ALT })).toBeTruthy();
    expect(screen.getByText('Making the image…')).toBeTruthy();
  });

  test('a failed new image keeps the old one and shows the error', () => {
    show({ kind: 'ready', image: saved, failure: 'image_blocked' });
    expect(screen.getByRole('img', { name: ALT })).toBeTruthy();
    expect(screen.getByText("This image couldn't be made. Try again for a new one.")).toBeTruthy();
  });

  test('the image itself has no buttons', () => {
    show({ kind: 'ready', image: saved });
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('See the story image', () => {
  test('opens the story full screen, and closes', async () => {
    wrap(<StoryLink image={saved} altText={ALT} />);
    fireEvent.click(screen.getByRole('button', { name: 'See the story image' }));
    const dialog = await screen.findByRole('dialog');
    expect((dialog.querySelector('img') as HTMLImageElement).src).toMatch(/^blob:test-/);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('a post image', () => {
  test('making shows the placeholder', () => {
    show({ kind: 'making' });
    expect(screen.getByText('Making the image…')).toBeTruthy();
  });

  test('ready shows the post crop with its alt text', () => {
    show({ kind: 'ready', image: saved });
    const img = screen.getByRole('img', { name: ALT }) as HTMLImageElement;
    expect(img.src).toBe('blob:test-1');
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

// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { TakeAway } from '@/components/posts/take-away';
import type { SavedImage } from '@/lib/posts/image-store';
import messages from '@/messages/en.json';
import { post } from './helpers/posts';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const CTA = 'Book on WhatsApp: +6281234567890';
const image: SavedImage = {
  postId: 'p1',
  batchId: 'b1',
  ownerId: 'svarga',
  story: new Blob(['s'], { type: 'image/jpeg' }),
  post: new Blob(['p'], { type: 'image/jpeg' }),
  imagePrompt: 'x',
  model: 'm',
  promptVersion: 'images-3',
  createdAt: '2026-10-25T10:00:00.000Z',
};

function show({ withImage = true, imagesOn = true } = {}) {
  render(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
      <TakeAway
        post={post()}
        cta={CTA}
        image={withImage ? image : undefined}
        imagesOn={imagesOn}
        name="Svarga"
        createdAt="2026-10-25T09:00:00.000Z"
        attempt={2}
        n={3}
      />
    </NextIntlClientProvider>,
  );
}

const stubClipboard = (writeText: () => Promise<void>) =>
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });

describe('taking a post away', () => {
  test('Copied for 2 s, then Copy the text again', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(async () => {});
    stubClipboard(writeText);
    show();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy the text' }));
    });
    expect(writeText).toHaveBeenCalledWith(
      `Warm oil, slow hands.\n\n${CTA}\n\n#canggu #balimassage #aftersurf`,
    );
    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy();
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole('button', { name: 'Copy the text' })).toBeTruthy();
  });

  test('a refused clipboard opens the sheet with the text selected', async () => {
    stubClipboard(async () => {
      throw new DOMException('denied', 'NotAllowedError');
    });
    show();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy the text' }));
    });
    expect(await screen.findByText('Copy it from here.')).toBeTruthy();
    const box = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(box.value).toContain('#canggu');
    expect(box.readOnly).toBe(true);
  });

  test('Save the 2 images shares both, named by attempt and suggestion', async () => {
    const share = vi.fn(async () => {});
    vi.stubGlobal('navigator', { ...navigator, canShare: () => true, share });
    show();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save the 2 images' }));
    });
    const files = (share.mock.calls[0] as unknown as [{ files: File[] }])[0].files;
    expect(files.map((f) => f.name)).toEqual([
      'svarga-2026-10-25-attempt-2-suggestion-3-post.jpg',
      'svarga-2026-10-25-attempt-2-suggestion-3-story.jpg',
    ]);
    expect(
      screen.getByText(
        'In Instagram: make a post with the post image and paste the text, then a story with the story image.',
      ),
    ).toBeTruthy();
  });

  test('Save the 2 images waits for the image', () => {
    show({ withImage: false });
    expect(
      (screen.getByRole('button', { name: 'Save the 2 images' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  test('text only without images', () => {
    show({ withImage: false, imagesOn: false });
    expect(screen.queryByRole('button', { name: 'Save the 2 images' })).toBeNull();
    const copy = screen.getByRole('button', { name: 'Copy the text' });
    expect(copy.textContent).toBe('Copy the text');
    expect(
      screen.getByText('In Instagram: make a post with your own photo and paste the text.'),
    ).toBeTruthy();
  });
});

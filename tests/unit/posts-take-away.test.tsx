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

function show(withImage = true) {
  render(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
      <TakeAway
        post={post()}
        cta={CTA}
        image={withImage ? image : undefined}
        name="Svarga"
        createdAt="2026-10-25T09:00:00.000Z"
        number={1}
      />
    </NextIntlClientProvider>,
  );
}

const stubClipboard = (writeText: () => Promise<void>) =>
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });

describe('taking a post away', () => {
  test('Copied for 2 s, then Copy caption again', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(async () => {});
    stubClipboard(writeText);
    show();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy caption' }));
    });
    expect(writeText).toHaveBeenCalledWith(
      `Warm oil, slow hands.\n\n${CTA}\n\n#canggu #balimassage #aftersurf`,
    );
    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy();
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole('button', { name: 'Copy caption' })).toBeTruthy();
  });

  test('a refused clipboard opens the sheet with the text selected', async () => {
    stubClipboard(async () => {
      throw new DOMException('denied', 'NotAllowedError');
    });
    show();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy caption' }));
    });
    expect(await screen.findByText('Copy it from here.')).toBeTruthy();
    const box = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(box.value).toContain('#canggu');
    expect(box.readOnly).toBe(true);
  });

  test('the save buttons need an image', () => {
    show(false);
    expect(screen.getByRole('button', { name: 'Copy caption' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save post image' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save story image' })).toBeNull();
  });

  test('with an image, both save buttons show', () => {
    show();
    expect(screen.getByRole('button', { name: 'Save post image' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save story image' })).toBeTruthy();
  });
});

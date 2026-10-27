// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { CaptionTranslation } from '@/components/posts/caption-translation';
import { resetStoreForTests } from '@/lib/brand/store';
import type { Locale } from '@/lib/i18n/locale';
import { messagesFor } from '@/lib/i18n/messages';

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

const CAPTION = 'Warm oil and slow hands.';

function show(locale: Locale) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messagesFor(locale)} timeZone="UTC">
      <CaptionTranslation ownerId="sen" batchId="b1" postId="post-1" caption={CAPTION} />
    </NextIntlClientProvider>,
  );
}

const vi_ = messagesFor('vi').posts.translate;

describe("the owner's-language view", () => {
  test('no button in English', () => {
    const { container } = show('en');
    expect(container.textContent).toBe('');
  });

  test('Show in Tiếng Việt, then the translation and Hide', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        text: 'Dầu ấm.',
        model: 'gemini-3.5-flash-lite',
        promptVersion: 'translate-1',
      }),
    );
    show('vi');
    const button = screen.getByRole('button', {
      name: vi_.show.replace('{language}', 'Tiếng Việt'),
    });
    fireEvent.click(button);
    expect(await screen.findByText('Dầu ấm.')).toBeTruthy();
    expect(screen.getByText(vi_.label.replace('{language}', 'Tiếng Việt'))).toBeTruthy();
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      text: CAPTION,
      locale: 'vi',
    });
    fireEvent.click(screen.getByRole('button', { name: vi_.hide }));
    expect(screen.queryByText('Dầu ấm.')).toBeNull();
  });

  test('a failure shows its message and the button again', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'model_busy' }, { status: 503 }));
    show('id');
    const id_ = messagesFor('id').posts.translate;
    fireEvent.click(
      screen.getByRole('button', { name: id_.show.replace('{language}', 'Bahasa Indonesia') }),
    );
    expect(await screen.findByText(id_.errors.model_busy)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: id_.show.replace('{language}', 'Bahasa Indonesia') }),
    ).toBeTruthy();
  });
});

// The story text's own link (docs/specs/posts/story-text).
describe("the story text's translation", () => {
  const STORY = 'Long flight? 🌸';

  test('shows the story text in Tiếng Việt, asked with the caption', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        text: 'Dầu ấm.',
        story: 'Chuyến bay dài? 🌸',
        model: 'gemini-3.5-flash-lite',
        promptVersion: 'translate-2',
      }),
    );
    render(
      <NextIntlClientProvider locale="vi" messages={messagesFor('vi')} timeZone="UTC">
        <CaptionTranslation
          ownerId="sen"
          batchId="b1"
          postId="post-1"
          caption={CAPTION}
          story={STORY}
          part="story"
        />
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole('button', { name: vi_.show.replace('{language}', 'Tiếng Việt') }),
    );
    expect(await screen.findByText('Chuyến bay dài? 🌸')).toBeTruthy();
    expect(screen.queryByText('Dầu ấm.')).toBeNull();
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      text: CAPTION,
      story: STORY,
      locale: 'vi',
    });
  });
});

// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { UsageBar } from '@/components/usage/usage-bar';
import { UsageProvider } from '@/components/usage/usage-provider';
import { messagesFor } from '@/lib/i18n/messages';
import type { UsageAnswer } from '@/lib/usage/answer';
import { noteUsage } from '@/lib/usage/client';

// The phone in Da Nang: Pacific midnight in November is 15:00 there.
const zone = process.env.TZ;
process.env.TZ = 'Asia/Ho_Chi_Minh';
afterAll(() => {
  if (zone === undefined) delete process.env.TZ;
  else process.env.TZ = zone;
});

const base: UsageAnswer = {
  resetsAt: '2026-11-15T08:00:00.000Z',
  limited: true,
  left: { reads: 2, attempts: 2, newImages: 10, replies: 20 },
  limits: { reads: 3, attempts: 3, newImages: 10, replies: 20 },
  poolEmpty: false,
  images: { on: true, monthFull: false, backAt: '2026-12-01T00:00:00.000Z' },
};

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function answer(over: Partial<UsageAnswer> = {}) {
  fetchMock.mockImplementation(async () => Response.json({ ...base, ...over }));
}

function show(tab: 'business' | 'posts' | 'reviews', locale: 'en' | 'vi' = 'en') {
  return render(
    <NextIntlClientProvider locale={locale} messages={messagesFor(locale)}>
      <UsageProvider>
        <UsageBar tab={tab} />
      </UsageProvider>
    </NextIntlClientProvider>,
  );
}

const line = () => screen.getByTestId('usage-bar');

describe('the usage bar', () => {
  test('on the posts tab', async () => {
    answer();
    show('posts');
    await waitFor(() =>
      expect(line().textContent).toBe('Left today: 2 attempts, 10 new images · Resets at 15:00'),
    );
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/usage');
  });

  test('on the business and reviews tabs', async () => {
    answer();
    show('business');
    await waitFor(() =>
      expect(line().textContent).toBe('Left today: 2 website reads · Resets at 15:00'),
    );
    cleanup();
    show('reviews');
    await waitFor(() =>
      expect(line().textContent).toBe('Left today: 20 replies · Resets at 15:00'),
    );
  });

  test('a count at 0 in the error colour', async () => {
    answer({ left: { reads: 2, attempts: 0, newImages: 10, replies: 20 } });
    show('posts');
    await waitFor(() => expect(screen.getByText('0 attempts').className).toContain('text-error'));
  });

  test('without images, and with a full month', async () => {
    answer({ images: { on: false, monthFull: false, backAt: base.images.backAt } });
    show('posts');
    await waitFor(() =>
      expect(line().textContent).toBe('Left today: 2 attempts · Resets at 15:00'),
    );
    cleanup();
    answer({ images: { on: true, monthFull: true, backAt: base.images.backAt } });
    show('posts');
    await waitFor(() =>
      expect(line().textContent).toBe(
        'Left today: 2 attempts · Resets at 15:00 No new images until December 1.',
      ),
    );
  });

  test('the pool empty', async () => {
    answer({ poolEmpty: true });
    show('reviews');
    await waitFor(() =>
      expect(line().textContent).toBe("Shopfront has used today's free writing. Back at 15:00."),
    );
  });

  test('the developer', async () => {
    answer({ limited: false, left: undefined, limits: undefined });
    show('posts');
    await waitFor(() =>
      expect(line().textContent).toBe('No daily limits (developer) · Resets at 15:00'),
    );
  });

  test('empty when the answer fails, read again on a usage event', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    show('posts');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(line().textContent).toBe('');
    answer();
    act(() => noteUsage());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(line().textContent).toContain('2 attempts'));
  });

  test('in Vietnamese', async () => {
    answer();
    show('posts', 'vi');
    await waitFor(() =>
      expect(line().textContent).toBe(
        'Còn lại hôm nay: 2 lần thử, 10 hình mới · Làm mới lúc 15:00',
      ),
    );
  });
});

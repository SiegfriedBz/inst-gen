// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, test, vi } from 'vitest';
import messages from '@/messages/en.json';
import { senProfile } from './helpers/brand';

// A phone whose storage fails (full, or closed under the page): the Reviews
// tab still works, it only keeps nothing (docs/specs/reviews/reply-drafts).
vi.mock('@/lib/reviews/store', () => ({
  loadReview: async () => {
    throw new Error('storage broke');
  },
  saveReview: async () => {
    throw new DOMException('full', 'QuotaExceededError');
  },
  clearReview: async () => {
    throw new Error('storage broke');
  },
}));

const { ReviewsSection } = await import('@/components/reviews/reviews-section');

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('a phone whose storage fails', () => {
  test('still shows the form, and the replies once written', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          reviewLanguage: 'en',
          abusive: false,
          reviewTranslation: null,
          short: { text: 'Thank you, {name}! 🪷', translation: null },
          warm: { text: 'Dear {name}, thank you. 🙏', translation: null },
          model: 'gemini-3.5-flash-lite',
          promptVersion: 'reply-2',
        }),
      ),
    );
    render(
      <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
        <ReviewsSection ownerId="sen" profile={senProfile()} active />
      </NextIntlClientProvider>,
    );
    fireEvent.change(await screen.findByLabelText('The review'), {
      target: { value: 'Lovely massage.' },
    });
    fireEvent.change(screen.getByLabelText("Guest's name (optional)"), {
      target: { value: 'Anna K.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Write 2 replies' }));
    expect(await screen.findByText('Thank you, Anna K.! 🪷')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Paste a new review' }));
    expect(await screen.findByLabelText('The review')).toBeTruthy();
  });
});

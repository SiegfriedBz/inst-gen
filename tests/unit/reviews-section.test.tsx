// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ReviewsSection } from '@/components/reviews/reviews-section';
import { resetStoreForTests } from '@/lib/brand/store';
import type { ReplyResponse } from '@/lib/reviews/reply';
import { loadReview, saveReview } from '@/lib/reviews/store';
import messages from '@/messages/en.json';
import { senProfile } from './helpers/brand';

// The Reviews tab (docs/specs/reviews/reply-drafts, "The Reviews tab"),
// with English screen strings; the phone's locale decides the translations.

let fetchMock: ReturnType<typeof vi.fn>;
let copied: string[];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-25T12:00:00.000Z'));
  globalThis.indexedDB = new IDBFactory();
  resetStoreForTests();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  copied = [];
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async (text: string) => void copied.push(text) },
  });
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.unstubAllGlobals();
});

const REVIEW = 'Lovely hot stone massage! The room was a bit cold and we waited 20 minutes.';

function answer(over: Partial<ReplyResponse> = {}): ReplyResponse {
  return {
    reviewLanguage: 'en',
    abusive: false,
    reviewTranslation: 'Massage đá nóng tuyệt vời! Phòng hơi lạnh.',
    short: {
      text: 'Thank you, {name}! 🙏 Hope to see you again 🪷',
      translation: 'Cảm ơn {name}! 🪷',
    },
    warm: {
      text: 'Dear {name}, sorry about the cold room and the wait. 🙏',
      translation: 'Thân mến {name}, xin lỗi vì phòng lạnh.',
    },
    model: 'gemini-3.5-flash-lite',
    promptVersion: 'reply-1',
    ...over,
  };
}

const ok = (body: unknown) => Response.json(body);

function tab(locale = 'vi', active = true) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <ReviewsSection ownerId="sen" profile={senProfile()} active={active} />
    </NextIntlClientProvider>
  );
}

function renderTab(locale = 'vi') {
  return render(tab(locale));
}

const writeButton = () => screen.getByRole('button', { name: 'Write 2 replies' });

async function paste(review = REVIEW, name = 'Anna K.') {
  fireEvent.change(await screen.findByLabelText("Guest's name (optional)"), {
    target: { value: name },
  });
  fireEvent.change(screen.getByLabelText('The review'), { target: { value: review } });
}

async function writeReplies(body: ReplyResponse = answer(), name = 'Anna K.') {
  fetchMock.mockResolvedValueOnce(ok(body));
  await paste(REVIEW, name);
  fireEvent.click(writeButton());
  await screen.findByText('Short reply');
}

const sentBodies = () => fetchMock.mock.calls.map((call) => JSON.parse(String(call[1]?.body)));

describe('the empty tab', () => {
  test('shows the line, both fields and a disabled button', async () => {
    renderTab();
    expect(await screen.findByText(/Got a new review on Google Maps\?/)).toBeTruthy();
    expect(screen.getByLabelText("Guest's name (optional)")).toBeTruthy();
    expect(screen.getByLabelText('The review')).toBeTruthy();
    expect((writeButton() as HTMLButtonElement).disabled).toBe(true);
  });

  test('a blank review keeps the button disabled', async () => {
    renderTab();
    await paste(' \n  ');
    expect((writeButton() as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('The review'), { target: { value: REVIEW } });
    expect((writeButton() as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('writing', () => {
  test('shows the waiting state with the fields locked', async () => {
    let answerNow: (r: Response) => void = () => {};
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (answerNow = resolve)));
    renderTab();
    await paste();
    fireEvent.click(writeButton());
    const busy = await screen.findByRole('button', { name: 'Writing your replies…' });
    expect((busy as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Keep this page open for a few seconds.')).toBeTruthy();
    expect((screen.getByLabelText('The review') as HTMLTextAreaElement).disabled).toBe(true);
    answerNow(ok(answer()));
    await screen.findByText('Short reply');
  });

  test('a double tap sends one request', async () => {
    fetchMock.mockResolvedValue(ok(answer()));
    renderTab();
    await paste();
    const button = writeButton();
    fireEvent.click(button);
    fireEvent.click(button);
    await screen.findByText('Short reply');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('the request holds no name', async () => {
    renderTab();
    await writeReplies();
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).not.toContain('Anna');
    expect(sentBodies()[0]).toMatchObject({ hasName: true, locale: 'vi', country: 'VN' });
  });

  test('each error shows its line under the button, with the fields kept', async () => {
    renderTab();
    const lines: [Response | Error, string][] = [
      [
        Response.json({ error: 'model_busy' }, { status: 503 }),
        "Shopfront has used today's free writing. Try again tomorrow.",
      ],
      [
        Response.json({ error: 'model_timeout' }, { status: 504 }),
        'Writing your replies took too long. Try again.',
      ],
      [
        Response.json({ error: 'model_failed' }, { status: 502 }),
        'Something went wrong while writing your replies. Try again.',
      ],
      [new TypeError('network'), "You're offline. Try again when you're back."],
    ];
    await paste();
    for (const [result, line] of lines) {
      if (result instanceof Error) fetchMock.mockRejectedValueOnce(result);
      else fetchMock.mockResolvedValueOnce(result);
      fireEvent.click(writeButton());
      expect(await screen.findByText(line)).toBeTruthy();
      expect((screen.getByLabelText('The review') as HTMLTextAreaElement).value).toBe(REVIEW);
    }
  });
});

describe('the replies', () => {
  test('show the review and both replies, with the name and the translations', async () => {
    renderTab();
    await writeReplies();
    expect(screen.getByText(/^Anna K\.'s review · in /)).toBeTruthy();
    expect(screen.getByText(REVIEW)).toBeTruthy();
    expect(screen.getByText('Massage đá nóng tuyệt vời! Phòng hơi lạnh.')).toBeTruthy();
    expect(screen.getByText('Thank you, Anna K.! 🙏 Hope to see you again 🪷')).toBeTruthy();
    expect(screen.getByText('Cảm ơn Anna K.! 🪷')).toBeTruthy();
    expect(screen.getByText('Warmer reply')).toBeTruthy();
    expect(
      screen.getByText('Dear Anna K., sorry about the cold room and the wait. 🙏'),
    ).toBeTruthy();
    expect(screen.getByText('Thân mến Anna K., xin lỗi vì phòng lạnh.')).toBeTruthy();
    expect(screen.getByText('In Google Maps: open the review, tap Reply and paste.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Write 2 other replies' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Paste a new review' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Copy the text' })).toHaveLength(2);
  });

  test("the review's language is named in the screen's language", async () => {
    renderTab('en');
    await writeReplies(answer({ reviewLanguage: 'ru' }));
    expect(screen.getByText("Anna K.'s review · in Russian")).toBeTruthy();
  });

  test('with no name the heading says "The review"', async () => {
    renderTab('en');
    await writeReplies(answer({ reviewLanguage: 'ru' }), '');
    expect(screen.getByText('The review · in Russian')).toBeTruthy();
    expect(screen.getByText('Thank you! 🙏 Hope to see you again 🪷')).toBeTruthy();
  });

  test("no translation line when the review is in the owner's language", async () => {
    renderTab();
    await writeReplies(
      answer({
        reviewLanguage: 'vi',
        reviewTranslation: null,
        short: { text: 'Cảm ơn {name}! 🪷', translation: null },
        warm: { text: 'Thân mến {name}. 🙏', translation: null },
      }),
    );
    expect(screen.queryByText('Massage đá nóng tuyệt vời! Phòng hơi lạnh.')).toBeNull();
    expect(document.querySelectorAll('[data-translation]')).toHaveLength(0);
  });

  test('an abusive review shows the calm note', async () => {
    renderTab();
    await writeReplies(answer({ abusive: true }));
    expect(screen.getByText(/This review may be abusive or fake\./)).toBeTruthy();
  });

  test('"Copy the text" copies the reply with the name', async () => {
    renderTab();
    await writeReplies();
    fireEvent.click(screen.getAllByRole('button', { name: 'Copy the text' })[0]);
    await waitFor(() =>
      expect(copied).toEqual(['Thank you, Anna K.! 🙏 Hope to see you again 🪷']),
    );
  });

  test('"Write 2 other replies" sends the model\'s replies and replaces the cards', async () => {
    renderTab();
    await writeReplies();
    let answerNow: (r: Response) => void = () => {};
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (answerNow = resolve)));
    fireEvent.click(screen.getByRole('button', { name: 'Write 2 other replies' }));
    expect(await screen.findByRole('button', { name: 'Writing your replies…' })).toBeTruthy();
    expect(screen.getByText('Short reply')).toBeTruthy();
    answerNow(
      ok(
        answer({
          short: { text: 'Many thanks, {name}! 🪷', translation: 'Cảm ơn nhiều {name}!' },
          warm: { text: 'Hello {name}, thank you. 🙏', translation: 'Xin chào {name}.' },
        }),
      ),
    );
    await screen.findByText('Many thanks, Anna K.! 🪷');
    expect(screen.queryByText('Thank you, Anna K.! 🙏 Hope to see you again 🪷')).toBeNull();
    const again = sentBodies()[1];
    expect(again.avoid).toEqual([
      'Thank you, {name}! 🙏 Hope to see you again 🪷',
      'Dear {name}, sorry about the cold room and the wait. 🙏',
    ]);
    expect(JSON.stringify(again)).not.toContain('Anna');
  });

  test('an edit shows instead of the reply, hides its translation, and is copied', async () => {
    renderTab();
    await writeReplies();
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit the text' })[0]);
    const box = screen.getByRole('textbox', { name: 'Short reply' });
    fireEvent.change(box, { target: { value: 'Thanks Anna, see you soon! 🪷' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Thanks Anna, see you soon! 🪷')).toBeTruthy();
    expect(screen.queryByText('Cảm ơn Anna K.! 🪷')).toBeNull();
    expect(screen.getByText('Thân mến Anna K., xin lỗi vì phòng lạnh.')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Copy the text' })[0]);
    await waitFor(() => expect(copied).toEqual(['Thanks Anna, see you soon! 🪷']));
    expect((await loadReview('sen', new Date()))?.edits.short).toBe(
      'Thanks Anna, see you soon! 🪷',
    );
  });

  test('"Paste a new review" empties the tab and the phone', async () => {
    renderTab();
    await writeReplies();
    fireEvent.click(screen.getByRole('button', { name: 'Paste a new review' }));
    expect(await screen.findByText(/Got a new review on Google Maps\?/)).toBeTruthy();
    expect((screen.getByLabelText('The review') as HTMLTextAreaElement).value).toBe('');
    expect(await loadReview('sen', new Date())).toBeNull();
  });

  test('a kept review shows on opening, with no request', async () => {
    await saveReview({
      ownerId: 'sen',
      name: 'Anna K.',
      review: REVIEW,
      locale: 'vi',
      answer: answer(),
      edits: { short: null, warm: null },
      createdAt: '2026-10-25T10:00:00.000Z',
    });
    renderTab();
    expect(await screen.findByText('Thank you, Anna K.! 🙏 Hope to see you again 🪷')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('opening the tab after 3am empties it, even with the app left open overnight', async () => {
    await saveReview({
      ownerId: 'sen',
      name: 'Anna K.',
      review: REVIEW,
      locale: 'vi',
      answer: answer(),
      edits: { short: null, warm: null },
      createdAt: '2026-10-25T10:00:00.000Z',
    });
    const view = render(tab('vi', true));
    expect(await screen.findByText('Thank you, Anna K.! 🙏 Hope to see you again 🪷')).toBeTruthy();
    view.rerender(tab('vi', false));
    // The next morning, with no reload.
    vi.setSystemTime(new Date('2026-10-26T12:00:00.000Z'));
    view.rerender(tab('vi', true));
    expect(await screen.findByText(/Got a new review on Google Maps\?/)).toBeTruthy();
    expect(await loadReview('sen', new Date())).toBeNull();
  });
});

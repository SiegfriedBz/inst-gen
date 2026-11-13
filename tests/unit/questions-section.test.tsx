// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { QuestionsSection } from '@/components/questions/questions-section';
import { resetStoreForTests } from '@/lib/brand/store';
import type { AnswerResponse } from '@/lib/questions/question';
import { loadConversation, saveConversation } from '@/lib/questions/store';
import messages from '@/messages/en.json';
import { senProfile } from './helpers/brand';

// The Questions tab (docs/specs/questions/answer-drafts), with English screen
// strings.

let fetchMock: ReturnType<typeof vi.fn>;
let copied: string[];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-10T04:00:00.000Z'));
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

function answer(over: Partial<AnswerResponse> = {}): AnswerResponse {
  return {
    questionLanguage: 'en',
    sexual: false,
    unanswered: false,
    questionTranslation: 'Massage Thái giá bao nhiêu?',
    answer: {
      text: 'Hello!\n\nThai Massage, 60 min: VND 500k. 🪷',
      translation: 'Xin chào!\n\nMassage Thái.',
    },
    guest: { place: null, day: null, time: null },
    flags: [],
    model: 'gemini-3.5-flash-lite',
    promptVersion: 'answer-1',
    ...over,
  };
}

const ok = (body: unknown) => Response.json(body);
const sent = (i = 0) => JSON.parse(String(fetchMock.mock.calls[i]?.[1]?.body));

function tab(locale = 'vi') {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <QuestionsSection ownerId="sen" profile={senProfile()} active />
    </NextIntlClientProvider>
  );
}

const box = () => screen.findByLabelText("The guest's question");
const write = () => screen.getByRole('button', { name: 'Write an answer' });

async function ask(question = 'How much is a Thai massage? Call +84 905 123 456') {
  fireEvent.change(await box(), { target: { value: question } });
  fireEvent.click(write());
}

describe('the Questions tab, empty', () => {
  test('shows the intro, the box and its hint, the box off, the button off while empty', async () => {
    render(tab());
    await box();
    expect(screen.getByText(messages.questions.intro)).toBeTruthy();
    // Only the name is the owner's to take out (docs/specs/platform/easier-to-use).
    expect(screen.getByText("Take out the guest's name if it's in the message.")).toBeTruthy();
    const final = screen.getByRole('checkbox', {
      name: 'Make it the final answer',
    }) as HTMLInputElement;
    expect(final.checked).toBe(false);
    expect((write() as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('an answer', () => {
  test('shows the question, the answer and their translations, from a scrubbed request', async () => {
    fetchMock.mockResolvedValueOnce(ok(answer()));
    render(tab());
    await ask();
    // The question's language, named in the screen's (Vietnamese here).
    const english = new Intl.DisplayNames(['vi'], { type: 'language' }).of('en');
    expect(await screen.findByText(`The guest's question · in ${english}`)).toBeTruthy();
    expect(screen.getByText('Massage Thái giá bao nhiêu?')).toBeTruthy();
    expect(screen.getByText(/Thai Massage, 60 min: VND 500k/)).toBeTruthy();
    expect(screen.getByText(messages.questions.howTo)).toBeTruthy();
    expect(sent().question).toBe('How much is a Thai massage? Call [number]');
    expect(sent().final).toBe(false);
  });

  test('a final answer is asked for when the box is ticked', async () => {
    fetchMock.mockResolvedValueOnce(ok(answer()));
    render(tab());
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Make it the final answer' }));
    await ask();
    await screen.findByText(messages.questions.howTo);
    expect(sent().final).toBe(true);
  });

  test('the notes and a check line', async () => {
    fetchMock.mockResolvedValueOnce(
      ok(answer({ sexual: true, unanswered: true, flags: [{ kind: 'price', text: 'VND 450k' }] })),
    );
    render(tab());
    await ask();
    expect(await screen.findByText(messages.questions.sexual)).toBeTruthy();
    expect(screen.getByText(messages.questions.unanswered)).toBeTruthy();
    expect(
      screen.getByText("This price isn't on your website: VND 450k. Check it before sending."),
    ).toBeTruthy();
  });

  test('an error line', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: 'model_timeout' }, { status: 504 }));
    render(tab());
    await ask();
    expect(await screen.findByText(messages.questions.errors.model_timeout)).toBeTruthy();
  });
});

describe('what this guest has told you', () => {
  test('shows the details, keeps them for the next message, and sends them', async () => {
    fetchMock.mockResolvedValueOnce(
      ok(answer({ guest: { place: 'Hyatt', day: null, time: null } })),
    );
    fetchMock.mockResolvedValueOnce(ok(answer()));
    render(tab());
    await ask();
    expect(await screen.findByText('Staying at: Hyatt')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Paste the next message' }));
    await box();
    expect(screen.getByText('Staying at: Hyatt')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New conversation' })).toBeTruthy();
    await ask('Is 7 pm free?');
    await screen.findByText(messages.questions.howTo);
    expect(sent(1).known).toEqual({ place: 'Hyatt', day: null, time: null });
  });

  test('a new conversation clears them', async () => {
    fetchMock.mockResolvedValueOnce(
      ok(answer({ guest: { place: 'Hyatt', day: null, time: null } })),
    );
    render(tab());
    await ask();
    fireEvent.click(await screen.findByRole('button', { name: 'New conversation' }));
    await box();
    expect(screen.queryByText('Staying at: Hyatt')).toBeNull();
  });
});

describe('another answer, an edit, a reload', () => {
  test('"Write another answer" sends the shown answer and the box as ticked now', async () => {
    fetchMock.mockResolvedValueOnce(ok(answer()));
    fetchMock.mockResolvedValueOnce(
      ok(answer({ answer: { text: 'Hi again!\n\nAnother answer.', translation: null } })),
    );
    render(tab());
    await ask();
    // The box is off while the first answer is written.
    await screen.findByText(messages.questions.howTo);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Make it the final answer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Write another answer' }));
    expect(await screen.findByText(/Another answer\./)).toBeTruthy();
    expect(sent(1).avoid).toBe('Hello!\n\nThai Massage, 60 min: VND 500k. 🪷');
    expect(sent(1).final).toBe(true);
  });

  test('an edit hides the translation, and the copy holds the edit', async () => {
    fetchMock.mockResolvedValueOnce(ok(answer()));
    render(tab());
    await ask();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit the text' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Your answer' }), {
      target: { value: 'Hello! My own words.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Hello! My own words.')).toBeTruthy();
    expect(screen.queryByText('Xin chào!', { exact: false })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Copy the answer' }));
    await waitFor(() => expect(copied).toEqual(['Hello! My own words.']));
  });

  test('a reload shows the same question and answer, with no new request', async () => {
    fetchMock.mockResolvedValueOnce(ok(answer()));
    const first = render(tab());
    await ask();
    await screen.findByText(messages.questions.howTo);
    first.unmount();
    render(tab());
    expect(await screen.findByText(/Thai Massage, 60 min: VND 500k/)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// The final review (docs/specs/questions/answer-drafts, journal).
describe('one guest at a time', () => {
  test('"New conversation" is off while an answer is written, and clears the store', async () => {
    fetchMock.mockResolvedValueOnce(
      ok(answer({ guest: { place: 'Hyatt', day: null, time: null } })),
    );
    let release: (response: Response) => void = () => {};
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
    );
    render(tab());
    await ask();
    fireEvent.click(await screen.findByRole('button', { name: 'Paste the next message' }));
    await ask('Another guest: how much is it?');
    const reset = await screen.findByRole('button', { name: 'New conversation' });
    expect((reset as HTMLButtonElement).disabled).toBe(true);
    release(ok(answer()));
    await screen.findByText(messages.questions.howTo);
    fireEvent.click(screen.getByRole('button', { name: 'New conversation' }));
    await box();
    expect(await loadConversation('sen', new Date())).toBeNull();
  });

  test('the daily reset clears what the guest told, with the tab still open', async () => {
    fetchMock.mockResolvedValueOnce(
      ok(answer({ guest: { place: 'Hyatt', day: null, time: null } })),
    );
    render(tab());
    await ask();
    await screen.findByText('Staying at: Hyatt');
    // 16:00 in Da Nang: past Google's reset, 08:00Z in November.
    vi.setSystemTime(new Date('2026-11-10T09:00:00.000Z'));
    fireEvent.click(screen.getByRole('button', { name: 'Paste the next message' }));
    await box();
    expect(screen.queryByText('Staying at: Hyatt')).toBeNull();
    expect(await loadConversation('sen', new Date())).toBeNull();
  });

  test('a message written after the reset sends none of the details told before it', async () => {
    fetchMock.mockResolvedValueOnce(
      ok(answer({ guest: { place: 'Hyatt', day: null, time: null } })),
    );
    fetchMock.mockResolvedValueOnce(ok(answer()));
    render(tab());
    await ask();
    fireEvent.click(await screen.findByRole('button', { name: 'Paste the next message' }));
    await screen.findByText('Staying at: Hyatt');
    vi.setSystemTime(new Date('2026-11-10T09:00:00.000Z'));
    await ask('And tomorrow at 6 pm?');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(sent(1).known).toEqual({ place: null, day: null, time: null });
    expect(screen.queryByText('Staying at: Hyatt')).toBeNull();
  });

  test('"Write another answer" after the reset keeps the question, not the old answer', async () => {
    fetchMock.mockResolvedValueOnce(
      ok(answer({ guest: { place: 'Hyatt', day: null, time: null } })),
    );
    fetchMock.mockResolvedValueOnce(ok(answer()));
    render(tab());
    await ask();
    await screen.findByText('Staying at: Hyatt');
    vi.setSystemTime(new Date('2026-11-10T09:00:00.000Z'));
    fireEvent.click(screen.getByRole('button', { name: 'Write another answer' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(sent(1).question).toBe(sent(0).question);
    expect(sent(1).known).toEqual({ place: null, day: null, time: null });
    expect(sent(1).avoid).toBeNull();
  });

  test('a conversation from before the reset opens as an empty tab', async () => {
    await saveConversation({
      ownerId: 'sen',
      known: { place: 'Hyatt', day: null, time: null },
      current: null,
      updatedAt: '2026-11-09T04:00:00.000Z',
    });
    render(tab());
    await box();
    expect(screen.queryByText('Staying at: Hyatt')).toBeNull();
  });
});

describe('the language, the wait and the errors', () => {
  test('a language switch keeps the answer, and the next request uses the new language', async () => {
    fetchMock.mockResolvedValueOnce(ok(answer()));
    fetchMock.mockResolvedValueOnce(ok(answer()));
    const view = render(tab('vi'));
    await ask();
    await screen.findByText('Massage Thái giá bao nhiêu?');
    view.rerender(tab('en'));
    expect(screen.getByText('Massage Thái giá bao nhiêu?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Write another answer' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(sent(1).locale).toBe('en');
  });

  test('while an answer is written', async () => {
    fetchMock.mockImplementationOnce(() => new Promise(() => {}));
    render(tab());
    await ask();
    expect(await screen.findByRole('button', { name: 'Writing your answer…' })).toBeTruthy();
    expect(screen.getByText(messages.questions.keepOpen)).toBeTruthy();
    expect(((await box()) as HTMLTextAreaElement).disabled).toBe(true);
  });

  test.each([
    ['model_busy', 503],
    ['model_failed', 502],
    ['invalid_request', 400],
  ] as const)('the %s line', async (code, status) => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: code }, { status }));
    render(tab());
    await ask();
    expect(await screen.findByText(messages.questions.errors[code])).toBeTruthy();
  });

  test('the offline line, and a usage refusal', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    fetchMock.mockResolvedValueOnce(
      Response.json(
        { error: 'limit_reached', resetsAt: '2026-11-10T08:00:00.000Z' },
        { status: 429 },
      ),
    );
    render(tab());
    await ask();
    expect(await screen.findByText(messages.questions.errors.offline)).toBeTruthy();
    fireEvent.click(write());
    expect(await screen.findByText(/You've written today's 20 answers\. More at/)).toBeTruthy();
  });
});

import { describe, expect, test } from 'vitest';
import type { Recording } from '@/lib/ai/replay';
import { replayTextModel } from '@/lib/ai/replay';
import type { TextModel } from '@/lib/ai/text-model';
import { ANSWER_PROMPT_VERSION } from '@/lib/questions/answer-prompt';
import { type AnswerLog, formatAnswerLog, runAnswer } from '@/lib/questions/answer-run';
import type { ModelAnswer, QuestionBody } from '@/lib/questions/question';

// One answer on the server (docs/specs/questions/answer-drafts, "The model call").
const question = 'Do you come to the Hyatt tomorrow at 7 pm?';
const body: QuestionBody = {
  question,
  final: true,
  locale: 'vi',
  business: {
    name: 'Sen',
    summary: null,
    category: 'mobile massage spa',
    offerings: [{ name: 'Thai Massage', duration: '60 min', price: 'VND 500k' }],
    highlights: ['Free travel in our core areas'],
    hours: '08:30-23:00 daily',
    town: 'Da Nang',
    area: null,
    serviceArea: 'My Khe',
    contact: {
      whatsapp: '84898661224',
      phone: null,
      email: null,
      instagram: null,
      bookingUrl: null,
    },
  },
  country: 'VN',
  known: { place: null, day: null, time: null },
  avoid: null,
};
const part = (text: string) => ({ text, translation: `vi: ${text}` });
const answer: ModelAnswer = {
  questionLanguage: 'en',
  sexual: false,
  unanswered: false,
  questionTranslation: 'vi: question',
  greeting: part('Hello!'),
  answer: part('Yes, the Hyatt is in our free travel area. 🌸'),
  professionalOnly: part('We offer only professional therapeutic massage.'),
  callToAction: part('Shall we book you tomorrow at 7 pm?'),
  guest: { place: 'Hyatt', day: 'tomorrow', time: '7 pm' },
};
const rec = (final: ModelAnswer): Recording => ({
  modelId: 'm',
  promptVersion: 'p',
  partials: [],
  final,
});
const signal = () => new AbortController().signal;

function run(model: TextModel, logs: AnswerLog[] = [], timeoutMs?: number) {
  return runAnswer(body, 'sen', { model, log: (e) => logs.push(e), timeoutMs }, signal());
}

describe('runAnswer', () => {
  test('answers the built answer with the model and the prompt version', async () => {
    const out = await run(replayTextModel(rec(answer), { answers: rec(answer) }));
    if (!out.ok) throw new Error(out.code);
    expect(out.response.answer.text).toBe(
      'Hello!\n\nYes, the Hyatt is in our free travel area. 🪷\n\nShall we book you tomorrow at 7 pm?',
    );
    expect(out.response.guest).toEqual({ place: 'Hyatt', day: 'tomorrow', time: '7 pm' });
    expect(out.response.model).toBe('gemini-3.5-flash-lite');
    expect(out.response.promptVersion).toBe(ANSWER_PROMPT_VERSION);
  });

  test('says model_busy, model_timeout and model_failed', async () => {
    const busy = await run(replayTextModel(rec(answer), { error: 'busy' }));
    expect(busy).toEqual({ ok: false, code: 'model_busy' });
    const slow = await run(replayTextModel(rec(answer), { hang: true }), [], 20);
    expect(slow).toEqual({ ok: false, code: 'model_timeout' });
    const empty = { ...answer, callToAction: part('') };
    expect(await run(replayTextModel(rec(empty), { answers: rec(empty) }))).toEqual({
      ok: false,
      code: 'model_failed',
    });
  });

  test('logs one line that never holds the question, the answer or a detail', async () => {
    const logs: AnswerLog[] = [];
    await run(replayTextModel(rec(answer), { answers: rec(answer) }), logs);
    const line = formatAnswerLog(logs[0]);
    expect(line).toMatch(/^answer owner=sen model=gemini-3\.5-flash-lite prompt=answer-1 /);
    expect(line).toContain(' final=yes ');
    expect(line).toContain(' sexual=no ');
    expect(line).toContain(' known=place,day,time ');
    expect(line).toContain(' outcome=ok');
    for (const word of ['Hyatt', 'tomorrow', 'free travel', 'Hello'])
      expect(line).not.toContain(word);
  });

  test("says the word list fired when the model didn't", async () => {
    const logs: AnswerLog[] = [];
    await runAnswer(
      { ...body, question: 'Do you do happy ending?' },
      'sen',
      { model: replayTextModel(rec(answer), { answers: rec(answer) }), log: (e) => logs.push(e) },
      signal(),
    );
    expect(formatAnswerLog(logs[0])).toContain(' sexual=words ');
  });
});

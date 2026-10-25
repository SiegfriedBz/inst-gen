import { describe, expect, test } from 'vitest';
import type { Recording } from '@/lib/ai/replay';
import { replayTextModel } from '@/lib/ai/replay';
import type { PostsModelCall, TextModel } from '@/lib/ai/text-model';
import type { ModelReplies, ReplyBody } from '@/lib/reviews/reply';
import { replyPrompt } from '@/lib/reviews/reply-prompt';
import { formatReplyLog, type ReplyLog, runReply } from '@/lib/reviews/reply-run';

// One review's replies on the server (docs/specs/reviews/reply-drafts, "The
// model call").
const review = 'Lovely hot stone massage, the room was cold.';
const body: ReplyBody = {
  review,
  hasName: true,
  locale: 'vi',
  business: { name: 'Svarga', summary: 'A Balinese spa in Ubud.' },
  country: 'ID',
  avoid: null,
};
const answer: ModelReplies = {
  reviewLanguage: 'en',
  abusive: false,
  reviewTranslation: 'Massage đá nóng tuyệt vời, phòng lạnh.',
  short: { text: 'Thank you, {name}! 🪷', translation: 'Cảm ơn {name}! 🪷' },
  warm: { text: 'Dear {name}, sorry about the cold room. 🙏', translation: 'Thân mến {name}.' },
};
const rec: Recording = { modelId: 'm', promptVersion: 'p', partials: [], final: answer };

function capturing(model: TextModel, calls: PostsModelCall[]): TextModel {
  return {
    ...model,
    writeReplies(input, signal) {
      calls.push(input);
      return model.writeReplies(input, signal);
    },
  };
}

const signal = () => new AbortController().signal;

describe('runReply', () => {
  test('answers the checked replies with the model and prompt version', async () => {
    const calls: PostsModelCall[] = [];
    const out = await runReply(
      body,
      'svarga',
      { model: capturing(replayTextModel(rec, { replies: rec }), calls) },
      signal(),
    );
    expect(out).toEqual({
      ok: true,
      response: {
        ...answer,
        short: { text: 'Thank you, {name}! 🌼', translation: 'Cảm ơn {name}! 🌼' },
        model: 'gemini-3.5-flash-lite',
        promptVersion: 'reply-1',
      },
    });
    expect(calls).toEqual([replyPrompt(body, '🌼')]);
  });

  test('an empty reply is model_failed', async () => {
    const empty = { ...rec, final: { ...answer, warm: { text: ' ', translation: null } } };
    const out = await runReply(
      body,
      'sen',
      { model: replayTextModel(rec, { replies: empty }) },
      signal(),
    );
    expect(out).toEqual({ ok: false, code: 'model_failed' });
  });

  test('busy is model_busy, a model that never answers is model_timeout', async () => {
    expect(
      await runReply(body, 'sen', { model: replayTextModel(rec, { error: 'busy' }) }, signal()),
    ).toEqual({ ok: false, code: 'model_busy' });
    expect(
      await runReply(
        body,
        'sen',
        { model: replayTextModel(rec, { hang: true }), timeoutMs: 20 },
        signal(),
      ),
    ).toEqual({ ok: false, code: 'model_timeout' });
  });

  test('a caller that leaves is aborted', async () => {
    const controller = new AbortController();
    const pending = runReply(
      body,
      'sen',
      { model: replayTextModel(rec, { hang: true }) },
      controller.signal,
    );
    controller.abort();
    expect(await pending).toEqual({ ok: false, code: 'aborted' });
  });

  test('logs one line with no review and no reply', async () => {
    const logs: ReplyLog[] = [];
    await runReply(
      body,
      'svarga',
      { model: replayTextModel(rec, { replies: rec }), log: (entry) => logs.push(entry) },
      signal(),
    );
    expect(logs).toHaveLength(1);
    const line = formatReplyLog(logs[0]);
    expect(line).toMatch(/^reply /);
    expect(line).toContain('owner=svarga');
    expect(line).toContain('lang=en');
    expect(line).toContain('abusive=false');
    expect(line).toContain('outcome=ok');
    expect(line).toContain(`chars_in=${review.length}`);
    for (const text of [review, 'Thank you', 'Cảm ơn', 'Massage']) {
      expect(line).not.toContain(text);
    }
  });
});

import { describe, expect, test } from 'vitest';
import { replayTextModel } from '@/lib/ai/replay';
import type { TextModel } from '@/lib/ai/text-model';
import { ModelError } from '@/lib/ai/text-model';
import { translateBodySchema } from '@/lib/posts/translate';
import {
  TRANSLATE_PROMPT_VERSION,
  translatePostPrompt,
  translatePrompt,
} from '@/lib/posts/translate-prompt';
import { formatTranslateLog, runTranslate, type TranslateLog } from '@/lib/posts/translate-run';

const empty = { modelId: 'm', promptVersion: 'p', partials: [], final: {} };
const CAPTION = 'Warm oil and slow hands in your villa, only 450k for 60 minutes. 🌿';

function model(translate: TextModel['translateCaption']): TextModel {
  return { ...replayTextModel(empty), translateCaption: translate };
}

const signal = () => new AbortController().signal;

describe('the translate request', () => {
  test('text of 1 to 2,200 characters and a locale of id or vi', () => {
    expect(translateBodySchema.safeParse({ text: 'a', locale: 'vi' }).success).toBe(true);
    expect(translateBodySchema.safeParse({ text: 'a'.repeat(2200), locale: 'id' }).success).toBe(
      true,
    );
    expect(translateBodySchema.safeParse({ text: 'a'.repeat(2201), locale: 'id' }).success).toBe(
      false,
    );
    expect(translateBodySchema.safeParse({ text: '', locale: 'vi' }).success).toBe(false);
    expect(translateBodySchema.safeParse({ text: 'a', locale: 'en' }).success).toBe(false);
  });
});

describe('the translate prompt', () => {
  test('names the language and keeps facts as they are', () => {
    expect(TRANSLATE_PROMPT_VERSION).toBe('translate-2');
    const vi = translatePrompt('vi');
    expect(vi).toContain('Vietnamese');
    expect(vi).toMatch(/prices, numbers, names and emoji/);
    expect(vi).toMatch(/add nothing/i);
    expect(translatePrompt('id')).toContain('Indonesian');
  });
});

describe('runTranslate', () => {
  test('only the caption is sent, in its language', async () => {
    const seen: [string, string][] = [];
    const out = await runTranslate(
      { text: CAPTION, locale: 'vi' },
      'sen',
      {
        model: model(async (text, locale) => {
          seen.push([text, locale]);
          return 'Dầu ấm và đôi tay chậm rãi.';
        }),
      },
      signal(),
    );
    expect(seen).toEqual([[CAPTION, 'vi']]);
    expect(out).toEqual({
      ok: true,
      response: {
        text: 'Dầu ấm và đôi tay chậm rãi.',
        model: 'gemini-3.5-flash-lite',
        promptVersion: 'translate-2',
      },
    });
  });

  test('busy is model_busy, anything else model_failed', async () => {
    const busy = await runTranslate(
      { text: CAPTION, locale: 'vi' },
      'sen',
      {
        model: model(async () => {
          throw new ModelError('busy', 'quota');
        }),
      },
      signal(),
    );
    expect(busy).toEqual({ ok: false, code: 'model_busy' });
    const failed = await runTranslate(
      { text: CAPTION, locale: 'vi' },
      'sen',
      {
        model: model(async () => {
          throw new Error('boom');
        }),
      },
      signal(),
    );
    expect(failed).toEqual({ ok: false, code: 'model_failed' });
  });

  test('an empty answer is model_failed', async () => {
    const out = await runTranslate(
      { text: CAPTION, locale: 'vi' },
      'sen',
      { model: model(async () => '  ') },
      signal(),
    );
    expect(out).toEqual({ ok: false, code: 'model_failed' });
  });

  test('past the cut-off is model_timeout', async () => {
    const hang: TextModel['translateCaption'] = (_t, _l, s) =>
      new Promise((_resolve, reject) => {
        s.addEventListener('abort', () => reject(s.reason), { once: true });
      });
    const out = await runTranslate(
      { text: CAPTION, locale: 'id' },
      'sen',
      { model: model(hang), timeoutMs: 20 },
      signal(),
    );
    expect(out).toEqual({ ok: false, code: 'model_timeout' });
  });

  test('the log line has no text', async () => {
    const logs: TranslateLog[] = [];
    await runTranslate(
      { text: CAPTION, locale: 'vi' },
      'sen',
      { model: model(async () => 'Dầu ấm.'), log: (e) => logs.push(e) },
      signal(),
    );
    const line = formatTranslateLog(logs[0]);
    expect(line).toMatch(
      /^translate owner=sen locale=vi model=gemini-3\.5-flash-lite prompt=translate-2 chars_in=\d+ chars_out=7 total_ms=\d+ outcome=ok$/,
    );
    expect(line).not.toContain('oil');
    expect(line).not.toContain('Dầu');
  });
});

// One request for the caption and the story text (docs/specs/posts/story-text,
// "The owner's language").
describe('the caption and its story text', () => {
  const STORY = 'Long flight? 🌸 Deep tissue in your room, 60 min.';

  function both(translate: TextModel['translatePost']): TextModel {
    return { ...replayTextModel(empty), translatePost: translate };
  }

  test('the request takes a story text of 1 to 120 characters, counted with .length', () => {
    const ok = { text: 'a', story: `${'a'.repeat(117)} 🌸`, locale: 'vi' };
    expect(translateBodySchema.safeParse(ok).success).toBe(true);
    expect(translateBodySchema.safeParse({ ...ok, story: `${'a'.repeat(118)} 🌸` }).success).toBe(
      false,
    );
    expect(translateBodySchema.safeParse({ ...ok, story: '' }).success).toBe(false);
  });

  test('the prompt names both and answers both', () => {
    const prompt = translatePostPrompt('vi');
    expect(prompt).toContain('Vietnamese');
    expect(prompt).toContain('caption and the story text');
    expect(prompt).toMatch(/prices, numbers, names and emoji/);
  });

  test('both go in one call, and both come back', async () => {
    const seen: unknown[] = [];
    const entries: TranslateLog[] = [];
    const out = await runTranslate(
      { text: CAPTION, story: STORY, locale: 'vi' },
      'sen',
      {
        model: both(async (input, locale) => {
          seen.push([input, locale]);
          return { caption: 'Dầu ấm.', story: 'Chuyến bay dài? 🌸' };
        }),
        log: (e) => entries.push(e),
      },
      signal(),
    );
    expect(seen).toEqual([[{ caption: CAPTION, story: STORY }, 'vi']]);
    expect(out).toEqual({
      ok: true,
      response: {
        text: 'Dầu ấm.',
        story: 'Chuyến bay dài? 🌸',
        model: 'gemini-3.5-flash-lite',
        promptVersion: 'translate-2',
      },
    });
    expect(entries[0]).toMatchObject({
      charsIn: CAPTION.length + STORY.length,
      charsOut: 'Dầu ấm.'.length + 'Chuyến bay dài? 🌸'.length,
    });
  });

  test("an empty story text's translation is model_failed", async () => {
    const out = await runTranslate(
      { text: CAPTION, story: STORY, locale: 'vi' },
      'sen',
      { model: both(async () => ({ caption: 'Dầu ấm.', story: ' ' })) },
      signal(),
    );
    expect(out).toEqual({ ok: false, code: 'model_failed' });
  });
});

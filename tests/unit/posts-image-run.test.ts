import sharp from 'sharp';
import { beforeAll, describe, expect, test } from 'vitest';
import { ImageModelError } from '@/lib/ai/image-model';
import type { ImageBody } from '@/lib/posts/image';
import { formatImageLog, type ImageLog } from '@/lib/posts/image-log';
import { imagePrompt } from '@/lib/posts/image-prompt';
import { makePostImage } from '@/lib/posts/image-run';
import { fakeImageModel, tallPng } from './helpers/images';

const body: ImageBody = {
  postId: 'post-3',
  first: true,
  imagePrompt: 'Warm oil poured into an open palm beside a lantern at dusk',
  scene: 'detail',
};

let png: Uint8Array;
beforeAll(async () => {
  png = await tallPng();
});

const never = (_p: string, signal: AbortSignal) =>
  new Promise<never>((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  });

describe('makePostImage', () => {
  test('an image comes back as base64 story and post', async () => {
    const model = fakeImageModel(async () => ({ data: png, mediaType: 'image/png' }));
    const out = await makePostImage(body, 'sen', { model }, new AbortController().signal);
    if (!out.ok) throw new Error(`expected ok, got ${out.code}`);
    expect(out.response.postId).toBe('post-3');
    expect(out.response.model).toBe('gemini-nano-banana-2.1');
    expect(out.response.promptVersion).toBe('images-8');
    const story = await sharp(Buffer.from(out.response.story, 'base64')).metadata();
    const post = await sharp(Buffer.from(out.response.post, 'base64')).metadata();
    expect([story.width, story.height, story.format]).toEqual([1080, 1920, 'jpeg']);
    expect([post.width, post.height, post.format]).toEqual([1080, 1350, 'jpeg']);
  });

  test('the model gets the post prompt then the style line', async () => {
    const model = fakeImageModel(async () => ({ data: png, mediaType: 'image/png' }));
    await makePostImage(body, 'sen', { model }, new AbortController().signal);
    expect(model.prompts).toEqual([imagePrompt(body.imagePrompt)]);
  });

  test('the model gets the cleaned hint, and the log only says there was one', async () => {
    const prompts: string[] = [];
    const logs: ImageLog[] = [];
    const model = fakeImageModel(async (p) => {
      prompts.push(p);
      return { data: png, mediaType: 'image/png' };
    });
    await makePostImage(
      { ...body, hint: ' more\ngreen ' },
      'sen',
      { model, log: (e) => logs.push(e) },
      new AbortController().signal,
    );
    expect(prompts[0]).toBe(imagePrompt(body.imagePrompt, 'more green'));
    const line = formatImageLog(logs[0]);
    expect(line).toContain('hint=yes');
    expect(line).not.toContain('green');
  });

  test('no image is image_blocked', async () => {
    const model = fakeImageModel(async () => null);
    const out = await makePostImage(body, 'sen', { model }, new AbortController().signal);
    expect(out).toEqual({ ok: false, code: 'image_blocked' });
  });

  test('paused is images_paused', async () => {
    const model = fakeImageModel(async () => {
      throw new ImageModelError('paused', 'Resource exhausted');
    });
    const out = await makePostImage(body, 'sen', { model }, new AbortController().signal);
    expect(out).toEqual({ ok: false, code: 'images_paused' });
  });

  test('past the cut-off is image_timeout', async () => {
    const model = fakeImageModel(never);
    const out = await makePostImage(
      body,
      'sen',
      { model, timeoutMs: 20 },
      new AbortController().signal,
    );
    expect(out).toEqual({ ok: false, code: 'image_timeout' });
  });

  test('a crop failure is image_failed', async () => {
    const model = fakeImageModel(async () => ({
      data: Uint8Array.of(1, 2, 3),
      mediaType: 'image/png',
    }));
    const out = await makePostImage(body, 'sen', { model }, new AbortController().signal);
    expect(out).toEqual({ ok: false, code: 'image_failed' });
  });

  test('a closed request is aborted and logs aborted', async () => {
    const logs: ImageLog[] = [];
    const controller = new AbortController();
    const model = fakeImageModel(never);
    const pending = makePostImage(
      body,
      'sen',
      { model, log: (e) => logs.push(e) },
      controller.signal,
    );
    controller.abort();
    expect(await pending).toEqual({ ok: false, code: 'aborted' });
    expect(logs.map((l) => l.outcome)).toEqual(['aborted']);
  });

  test('the log line never holds the prompt, and counts the cost once an image came back', async () => {
    const logs: ImageLog[] = [];
    const ok = fakeImageModel(async () => ({ data: png, mediaType: 'image/png' }));
    await makePostImage(
      body,
      'sen',
      { model: ok, log: (e) => logs.push(e) },
      new AbortController().signal,
    );
    const blocked = fakeImageModel(async () => null);
    await makePostImage(
      body,
      'sen',
      { model: blocked, log: (e) => logs.push(e) },
      new AbortController().signal,
    );
    expect(logs.map((l) => [l.outcome, l.usd])).toEqual([
      ['ok', 0.05],
      ['image_blocked', 0],
    ]);
    expect(logs[0]).toMatchObject({
      owner: 'sen',
      postId: 'post-3',
      scene: 'detail',
      size: '1536x2752',
    });
    const line = formatImageLog(logs[0]);
    expect(line).not.toContain(body.imagePrompt);
    expect(line).toMatch(
      /^image owner=sen post=post-3 scene=detail hint=no cast=no model=gemini-nano-banana-2\.1 prompt=images-8 size=1536x2752 story_bytes=\d+ post_bytes=\d+ model_ms=\d+ total_ms=\d+ outcome=ok usd=0\.05$/,
    );
    expect(formatImageLog(logs[1])).toContain('size=- story_bytes=- post_bytes=-');
  });
});

describe('the set-up', () => {
  const setup = {
    treatment: 'Foot Reflexology',
    look: 'foot',
    guests: 'man',
    therapists: 1,
    bodyPart: 'feet',
    scene: 'detail',
    locals: 'Vietnamese',
  } as const;

  test('the model gets the cast line, and the log says it was sent', async () => {
    const logs: ImageLog[] = [];
    const model = fakeImageModel(async () => ({ data: png, mediaType: 'image/png' }));
    await makePostImage(
      { ...body, setup },
      'sen',
      { model, log: (e) => logs.push(e) },
      new AbortController().signal,
    );
    expect(model.prompts).toEqual([imagePrompt(body.imagePrompt, undefined, setup)]);
    expect(formatImageLog(logs[0])).toContain('hint=no cast=yes');
  });
});

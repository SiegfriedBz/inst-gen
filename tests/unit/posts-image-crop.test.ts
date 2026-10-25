import sharp from 'sharp';
import { describe, expect, test } from 'vitest';
import { storyAndPost } from '@/lib/posts/image-crop';

// A 1536×2752 PNG, as Nano Banana 2.1 returns: red in the top fifth, blue in
// the bottom fifth, green between.
async function bandedPng(): Promise<Uint8Array> {
  const width = 1536;
  const height = 2752;
  const band = Math.round(height / 5);
  const solid = (h: number, r: number, g: number, b: number) =>
    sharp({ create: { width, height: h, channels: 3, background: { r, g, b } } })
      .png()
      .toBuffer();
  const [top, bottom] = await Promise.all([solid(band, 255, 0, 0), solid(band, 0, 0, 255)]);
  const out = await sharp({
    create: { width, height, channels: 3, background: { r: 0, g: 255, b: 0 } },
  })
    .composite([
      { input: top, top: 0, left: 0 },
      { input: bottom, top: height - band, left: 0 },
    ])
    .png()
    .toBuffer();
  return new Uint8Array(out);
}

async function rowColour(jpeg: Buffer, row: number) {
  const { data, info } = await sharp(jpeg).raw().toBuffer({ resolveWithObject: true });
  const i = (row * info.width + Math.floor(info.width / 2)) * info.channels;
  return { r: data[i], g: data[i + 1], b: data[i + 2] };
}

describe('storyAndPost', () => {
  test('a 1536×2752 PNG becomes a 1080×1920 story and a 1080×1350 post', async () => {
    const out = await storyAndPost(await bandedPng());
    expect(await sharp(out.story).metadata()).toMatchObject({
      format: 'jpeg',
      width: 1080,
      height: 1920,
    });
    expect(await sharp(out.post).metadata()).toMatchObject({
      format: 'jpeg',
      width: 1080,
      height: 1350,
    });
    expect([out.inWidth, out.inHeight]).toEqual([1536, 2752]);
  });

  test('the post is the story centre', async () => {
    const out = await storyAndPost(await bandedPng());
    // The story keeps the red and blue bands; the post's 285-row trim drops
    // most of them, so its first and last rows are still red and blue only
    // if the crop is centred: a top-aligned crop would end in green.
    const storyTop = await rowColour(out.story, 0);
    expect(storyTop.r).toBeGreaterThan(200);
    const postTop = await rowColour(out.post, 0);
    const postBottom = await rowColour(out.post, 1349);
    const postMiddle = await rowColour(out.post, 675);
    // Bands are 384 story rows high (1920 / 5); 285 trimmed leaves 99 of each.
    expect(postTop.r).toBeGreaterThan(200);
    expect(postBottom.b).toBeGreaterThan(200);
    expect(postMiddle.g).toBeGreaterThan(200);
    const justInside = await rowColour(out.post, 120);
    expect(justInside.g).toBeGreaterThan(200);
  });

  test('metadata is stripped', async () => {
    const withExif = await sharp(await bandedPng())
      .withMetadata({ exif: { IFD0: { Copyright: 'someone' } } })
      .jpeg()
      .toBuffer();
    const out = await storyAndPost(new Uint8Array(withExif));
    expect((await sharp(out.story).metadata()).exif).toBeUndefined();
    expect((await sharp(out.post).metadata()).exif).toBeUndefined();
  });

  test('an off-ratio JPEG input', async () => {
    const square = await sharp({
      create: { width: 1024, height: 1024, channels: 3, background: '#a08060' },
    })
      .jpeg()
      .toBuffer();
    const out = await storyAndPost(new Uint8Array(square));
    expect(await sharp(out.story).metadata()).toMatchObject({ width: 1080, height: 1920 });
    expect(await sharp(out.post).metadata()).toMatchObject({ width: 1080, height: 1350 });
    expect([out.inWidth, out.inHeight]).toEqual([1024, 1024]);
  });

  test('a non-image throws', async () => {
    await expect(storyAndPost(new Uint8Array([1, 2, 3]))).rejects.toThrow();
  });
});

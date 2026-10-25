import type { Page } from '@playwright/test';
import sharp from 'sharp';
import type { ImageResponse } from '@/lib/posts/image';

// Small real JPEGs for the image route's answers, so the phone tests never
// reach the real route or Google.
let jpegs: Promise<{ story: string; post: string }> | null = null;

function smallJpegs() {
  const make = (width: number, height: number) =>
    sharp({ create: { width, height, channels: 3, background: '#b08a60' } })
      .jpeg()
      .toBuffer()
      .then((b) => b.toString('base64'));
  jpegs ??= Promise.all([make(108, 192), make(108, 135)]).then(([story, post]) => ({
    story,
    post,
  }));
  return jpegs;
}

export async function imageAnswer(postId: string): Promise<ImageResponse> {
  const { story, post } = await smallJpegs();
  return {
    postId,
    story,
    post,
    model: 'gemini-nano-banana-2.1',
    promptVersion: 'images-1',
    ms: 10,
  };
}

type Failure = { status: number; error: string };

// Answers POSTs to /api/posts/image, after `delayMs`, with an image or, for
// the posts `failures` names, an error. `failures` can change between calls.
// Returns how many requests it answered.
export async function fulfilImages(
  page: Page,
  failures: Record<string, Failure>,
  delayMs = 0,
): Promise<{ count(): number }> {
  let count = 0;
  await page.route('**/api/posts/image', async (route) => {
    count += 1;
    const { postId } = route.request().postDataJSON() as { postId: string };
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    const failure = failures[postId];
    if (failure) {
      await route.fulfill({ status: failure.status, json: { error: failure.error } });
    } else {
      await route.fulfill({ status: 200, json: await imageAnswer(postId) });
    }
  });
  return { count: () => count };
}

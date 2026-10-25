import type { Page } from '@playwright/test';
import type { Profile } from '@/lib/brand/profile';
import type { PostsErrorCode } from '@/lib/posts/batch';
import { profileHash } from '@/lib/posts/input';
import { encodePostsLine, type PostsLine } from '@/lib/posts/stream';
import { post } from '../../unit/helpers/posts';

// A post plan's NDJSON answer for a profile, so the phone tests never reach
// the real routes or a model.
export function postsBody(
  profile: Profile,
  opts: { error?: PostsErrorCode; caption?: string } = {},
): string {
  if (opts.error) return encodePostsLine({ type: 'error', code: opts.error });
  const types = ['offer', 'offer', 'moment', 'local', 'ritual', 'tip'] as const;
  const posts = types.map((type, i) =>
    post({
      id: `post-${i + 1}`,
      type,
      topic: `Topic ${i + 1}`,
      caption: `${opts.caption ?? 'Caption'} ${i + 1}.`,
    }),
  );
  const lines: PostsLine[] = posts.map((p, index) => ({ type: 'post', index, post: p }));
  lines.push({
    type: 'final',
    result: {
      posts,
      dropped: [],
      promptVersion: 'posts-1',
      model: 'm',
      profileHash: profileHash(profile),
    },
  });
  return lines.map(encodePostsLine).join('');
}

// Answers POSTs to /api/posts/<path> with `body`, and counts them.
export async function fulfilPosts(
  page: Page,
  path: 'plan' | 'rewrite',
  body: string,
): Promise<{ count(): number }> {
  let requests = 0;
  await page.route(`**/api/posts/${path}`, async (route) => {
    requests += 1;
    await route.fulfill({ status: 200, contentType: 'application/x-ndjson', body });
  });
  return { count: () => requests };
}

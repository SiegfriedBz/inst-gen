'use client';

import { useTranslations } from 'next-intl';
import type { Post } from '@/lib/posts/batch';

// One post as the owner reads it before 2.4's feed preview: what it is, the
// words to post, and what to check (docs/specs/posts/generate-copy, "On the
// screen"). The image prompt is 2.3's and isn't shown.
export function PostCard({ post, cta }: { post: Post; cta: string }) {
  const t = useTranslations('posts');
  return (
    <article className="rounded-control border border-edge bg-field px-4 py-3">
      <p className="text-[13px] font-medium text-accent">{t(`types.${post.type}`)}</p>
      <p className="mt-2 whitespace-pre-line text-[15px] leading-normal text-ink">{post.caption}</p>
      {cta && <p className="mt-3 text-[15px] leading-normal text-ink">{cta}</p>}
      {post.hashtags.length > 0 && (
        <p className="mt-3 text-[15px] text-accent">
          {post.hashtags.map((tag) => `#${tag}`).join(' ')}
        </p>
      )}
      <p className="mt-3 text-[13px] text-ink-secondary">{t('imageDescription')}</p>
      <p className="text-[15px] leading-normal text-ink">{post.altText}</p>
      {post.unchecked.length > 0 && (
        <div className="mt-3 text-[13px] text-ink-secondary">
          <p>{t('check')}</p>
          <ul className="list-disc pl-5">
            {post.unchecked.map((flag) => (
              <li key={`${flag.kind}:${flag.text}`}>
                {t(`flags.${flag.kind}`, { text: flag.text })}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

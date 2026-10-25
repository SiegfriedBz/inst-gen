'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import type { Flag, Post } from '@/lib/posts/batch';
import { type ImageState, PostImage } from './post-image';

// One post as the owner reads it before 2.4's feed preview: what it is, the
// words to post, and what to check (docs/specs/posts/generate-copy, "On the
// screen"), with its image above (docs/specs/posts/generate-images). The image
// prompt isn't shown.
export function PostCard({
  post,
  cta,
  image,
  flags = post.unchecked,
  onRewrite,
  busy = false,
}: {
  post: Post;
  cta: string;
  image?: { state: ImageState; onRetry?: () => void };
  // What to check before posting; an edited post's follow today's details.
  flags?: Flag[];
  // "Rewrite this one too", on an edited post that is out of date.
  onRewrite?: () => void;
  busy?: boolean;
}) {
  const t = useTranslations('posts');
  return (
    <article className="rounded-control border border-edge bg-field px-4 py-3">
      {image && (
        <div className="mb-3">
          <PostImage state={image.state} altText={post.altText} onRetry={image.onRetry} />
        </div>
      )}
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
      {flags.length > 0 && (
        <div className="mt-3 text-[13px] text-ink-secondary">
          <p>{t('check')}</p>
          <ul className="list-disc pl-5">
            {flags.map((flag) => (
              <li key={`${flag.kind}:${flag.text}`}>
                {t(`flags.${flag.kind}`, { text: flag.text })}
              </li>
            ))}
          </ul>
        </div>
      )}
      {onRewrite && (
        <Button type="button" className="mt-3" onClick={onRewrite} disabled={busy}>
          {t('rewriteOne')}
        </Button>
      )}
    </article>
  );
}

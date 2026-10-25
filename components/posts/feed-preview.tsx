'use client';

import { useTranslations } from 'next-intl';
import type { Post, PostBatch } from '@/lib/posts/batch';
import { imageKey, type SavedImage } from '@/lib/posts/image-store';
import { useObjectUrl } from './object-url';

// A batch as the owner's Instagram grid will show it once posted
// (docs/specs/posts/editor-download, "The feed preview"): three across, the
// last post first, each tile a centred 3:4 slice of the post. Nothing here
// can be edited; a tap goes to the post's card.

function Tile({
  post,
  number,
  image,
  onPick,
}: {
  post: Post;
  number: number;
  image: SavedImage | undefined;
  onPick: () => void;
}) {
  const t = useTranslations('posts');
  const url = useObjectUrl(image?.post ?? null);
  return (
    <button
      type="button"
      aria-label={t('number', { n: number })}
      onClick={onPick}
      className="relative block aspect-[3/4] w-full overflow-hidden bg-accent-tint text-left"
    >
      {image && url ? (
        // biome-ignore lint/performance/noImgElement: a blob URL from the phone's store; next/image has nothing to optimise
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center px-1 text-center text-[13px] text-accent-tint-ink">
          {t(`types.${post.type}`)}
        </span>
      )}
      <span className="absolute bottom-1 left-1.5 text-[12px] font-medium text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.6)]">
        {number}
      </span>
    </button>
  );
}

export function FeedPreview({
  batch,
  images,
  onPick,
}: {
  batch: PostBatch;
  images: Map<string, SavedImage>;
  onPick: (postId: string) => void;
}) {
  const t = useTranslations('posts.feed');
  const numbered = batch.posts.map((post, index) => ({ post, number: index + 1 }));
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[15px] font-medium text-ink">{t('title')}</p>
      <p className="rounded-control bg-accent-tint px-3 py-2 text-[13px] text-accent-tint-ink">
        {t('order')}
      </p>
      <div className="grid grid-cols-3 gap-[2px]">
        {numbered.reverse().map(({ post, number }) => (
          <Tile
            key={post.id}
            post={post}
            number={number}
            image={images.get(imageKey(batch.id, post.id))}
            onPick={() => onPick(post.id)}
          />
        ))}
      </div>
    </div>
  );
}

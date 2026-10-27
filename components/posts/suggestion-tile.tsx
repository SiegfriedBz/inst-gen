'use client';

import { Check } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';
import type { Ref } from 'react';
import { UsageMessage } from '@/components/usage/usage-message';
import type { Post } from '@/lib/posts/batch';
import { useObjectUrl } from './object-url';
import { FailureText, type ImageState } from './post-image';

// One suggestion in its attempt's grid (docs/specs/platform/friendlier-home,
// "A tile"): the post image, the caption's first words, "Check the text" when
// a warning applies, and "Saved and copied" once both steps are done. One
// button: it opens the suggestion. No type label or number on screen.

const EXCERPT_WORDS = 8;

export function SuggestionTile({
  post,
  n,
  count,
  image,
  taken,
  check,
  onOpen,
  disabled = false,
  textOnly = image.kind === 'off',
  ref,
}: {
  post: Post;
  n: number;
  count: number;
  image: ImageState;
  taken: 'savedAndCopied' | 'copied' | null;
  check: boolean;
  onOpen: () => void;
  disabled?: boolean;
  // No image to show or save: a text card.
  textOnly?: boolean;
  ref?: Ref<HTMLButtonElement>;
}) {
  const t = useTranslations('posts');
  const excerpt = post.caption.split(/\s+/).slice(0, EXCERPT_WORDS).join(' ');
  const state =
    taken === 'savedAndCopied' ? t('saved') : taken === 'copied' ? t('copiedOnly') : null;
  const name = [t('tile', { n, count }), excerpt, state ?? (check ? t('checkText') : null)]
    .filter(Boolean)
    .join(', ');
  const tick = taken && (
    <span className="absolute top-1.5 right-1.5 flex size-[22px] items-center justify-center rounded-full bg-accent text-on-accent">
      <Check aria-hidden="true" size={13} weight="bold" />
    </span>
  );

  return (
    <button
      ref={ref}
      type="button"
      aria-label={name}
      onClick={onOpen}
      disabled={disabled}
      className="flex min-w-0 flex-col gap-1.5 rounded-control text-left outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
    >
      {textOnly ? (
        <span className="relative block w-full rounded-control border border-edge bg-field px-2.5 py-2 text-[14px] leading-snug text-ink">
          <span className="line-clamp-6">{post.caption}</span>
          {tick}
        </span>
      ) : (
        <span className="relative block">
          <TileImage state={image} altText={post.altText} />
          {tick}
        </span>
      )}
      {!textOnly && (
        <span className="line-clamp-2 text-[13px] leading-snug text-ink">{post.caption}</span>
      )}
      {state ? (
        <span className="text-[12px] font-medium text-accent-tint-ink">{state}</span>
      ) : (
        check && <span className="text-[12px] text-error">{t('checkText')}</span>
      )}
    </button>
  );
}

function TileImage({ state, altText }: { state: ImageState; altText: string }) {
  const t = useTranslations('posts.images');
  const ready = state.kind === 'ready' ? state : null;
  const url = useObjectUrl(ready ? ready.image.post : null);
  if (ready && url) {
    return (
      // biome-ignore lint/performance/noImgElement: a blob URL from the phone's store; next/image has nothing to optimise
      <img
        src={url}
        alt={altText}
        className={`aspect-[4/5] w-full rounded-control object-cover${ready.making ? ' opacity-40' : ''}`}
      />
    );
  }
  return (
    <span className="flex aspect-[4/5] w-full items-center justify-center rounded-control bg-field-muted px-2 text-center text-[12px] leading-snug text-ink-secondary">
      {state.kind === 'making' ? (
        t('making')
      ) : state.kind === 'month' ? (
        <UsageMessage code="images_month" action="newImages" />
      ) : state.kind === 'failed' && state.code !== 'images_off' ? (
        <FailureText code={state.code} />
      ) : null}
    </span>
  );
}

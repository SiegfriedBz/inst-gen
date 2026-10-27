'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { UsageMessage } from '@/components/usage/usage-message';
import { useAtLimit } from '@/components/usage/usage-provider';
import type { Flag, Post } from '@/lib/posts/batch';
import type { PostEdit } from '@/lib/posts/edit';
import type { Offer } from '@/lib/posts/offer';
import { OfferBadge } from './offer-badge';
import { PostEditor } from './post-editor';
import { type ImageState, NewImageLink, PostImage, StoryLink } from './post-image';
import { SheetPart } from './sheet-part';

// One suggestion, as its sheet shows it (docs/specs/posts/story-text, "What
// the owner sees"): three boxed parts, each with its button under what it
// takes away. Images: the post and story images side by side, "Create new
// image" and the save button. Post text: the text as it will be pasted,
// plain-word warnings, "Edit the text", then its translation, then the copy
// button. Story text, when the post has one: its words, warnings and
// translation, then its copy button. No type label, number or image
// description.

// What's worth a word to the owner: a price, a duration, a word Instagram
// may refuse, or a caption off the special offer. The first-line check isn't shown.
export const SHOWN_FLAGS: Flag['kind'][] = ['price', 'duration', 'banned', 'offer'];

function Warnings({ flags }: { flags: Flag[] }) {
  const t = useTranslations('posts');
  return flags
    .filter((flag) => SHOWN_FLAGS.includes(flag.kind))
    .map((flag) => (
      <p
        key={`${flag.kind}:${flag.text}`}
        role="note"
        className="mt-3 rounded-control bg-accent-tint px-3 py-2 text-[13px] text-accent-tint-ink"
      >
        {t(`flags.${flag.kind}`, { text: flag.text })}
      </p>
    ));
}

export function PostCard({
  post,
  cta,
  image,
  imagesOn = image !== undefined,
  flags = post.unchecked,
  storyFlags = post.storyUnchecked ?? [],
  onSave,
  onRewrite,
  busy = false,
  editBusy = busy,
  translation,
  storyTranslation,
  saveImages,
  copyPost,
  copyStory,
  offer,
}: {
  post: Post;
  cta: string;
  image?: { state: ImageState; onRetry?: () => void; onNewImage?: (hint: string) => void };
  // Without images, there is no Images part.
  imagesOn?: boolean;
  // What to check before posting; an edited post's follow today's details.
  flags?: Flag[];
  storyFlags?: Flag[];
  // No `onSave` (a suggestion still streaming in) means no "Edit the text".
  onSave?: (edit: PostEdit) => void;
  // "Rewrite this one too", on an edited suggestion that is out of date.
  onRewrite?: () => void;
  busy?: boolean;
  // Only a step that replaces the words holds "Edit the text"; images don't.
  editBusy?: boolean;
  translation?: ReactNode;
  storyTranslation?: ReactNode;
  // Each part's button and its hint.
  saveImages?: ReactNode;
  copyPost?: ReactNode;
  copyStory?: ReactNode;
  // The batch's special offer, when this post carries it.
  offer?: Offer;
}) {
  const t = useTranslations('posts');
  const [editing, setEditing] = useState(false);
  const state = image?.state;
  const canRemake =
    state?.kind === 'ready' ||
    (state?.kind === 'failed' && state.code !== 'offline' && state.code !== 'images_off');
  const remaking = state?.kind === 'making' || (state?.kind === 'ready' && !!state.making);
  const newImageLimit = useAtLimit('newImages');
  const textPart = imagesOn ? 2 : 1;
  return (
    <article className="flex flex-col gap-3.5">
      {/* No Images part: the line saying why there are no pictures stays. */}
      {!imagesOn && image && image.state.kind !== 'ready' && (
        <PostImage state={image.state} altText={post.altText} onRetry={image.onRetry} />
      )}
      {imagesOn && (
        <SheetPart n={1} title={t('parts.images')}>
          {state?.kind === 'ready' ? (
            <>
              <div className="grid grid-cols-[2fr_1fr] items-start gap-2">
                <PostImage state={state} altText={post.altText} onRetry={image?.onRetry} />
                <StoryLink image={state.image} altText={post.altText} thumbnail />
              </div>
              <div className="mt-1 grid grid-cols-[2fr_1fr] gap-2 text-center text-[12px] text-ink-secondary">
                <span>{t('parts.postImage')}</span>
                <span>{t('parts.storyImage')}</span>
              </div>
            </>
          ) : (
            image && (
              <PostImage state={image.state} altText={post.altText} onRetry={image.onRetry} />
            )
          )}
          {!editing && image?.onNewImage && canRemake && (
            <div className="mt-1 flex justify-end">
              <NewImageLink
                onMake={image.onNewImage}
                disabled={remaking || newImageLimit !== null}
              />
            </div>
          )}
          {!editing && image?.onNewImage && canRemake && newImageLimit && (
            <p className="text-[13px] text-error">
              <UsageMessage code={newImageLimit} action="newImages" />
            </p>
          )}
          {saveImages}
        </SheetPart>
      )}
      <SheetPart n={textPart} title={t('parts.postText')}>
        {editing && onSave ? (
          <PostEditor
            post={post}
            cta={cta}
            onCancel={() => setEditing(false)}
            onSave={(edit) => {
              setEditing(false);
              onSave(edit);
            }}
          />
        ) : (
          <div>
            {offer && (
              <div className="mb-2">
                <OfferBadge offer={offer} until />
              </div>
            )}
            <p className="whitespace-pre-line text-[15px] leading-normal text-ink">
              {post.caption}
            </p>
            {cta && <p className="mt-3 text-[15px] leading-normal text-ink">{cta}</p>}
            {post.hashtags.length > 0 && (
              <p className="mt-3 text-[15px] text-accent">
                {post.hashtags.map((tag) => `#${tag}`).join(' ')}
              </p>
            )}
          </div>
        )}
        <Warnings flags={flags} />
        {!editing && onSave && (
          <button
            type="button"
            className="mt-1 inline-flex min-h-11 items-center text-[15px] font-medium text-accent underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
            onClick={() => setEditing(true)}
            disabled={editBusy}
          >
            {t('editText')}
          </button>
        )}
        {!editing && translation}
        {onRewrite && (
          <Button type="button" className="mt-3" onClick={onRewrite} disabled={busy}>
            {t('rewriteOne')}
          </Button>
        )}
        {!editing && copyPost}
      </SheetPart>
      {post.storyText && (
        <SheetPart n={textPart + 1} title={t('parts.storyText')} optional>
          <p className="whitespace-pre-line text-[17px] leading-[1.45] font-medium text-ink">
            {post.storyText}
          </p>
          <Warnings flags={storyFlags} />
          {storyTranslation}
          {copyStory}
        </SheetPart>
      )}
    </article>
  );
}

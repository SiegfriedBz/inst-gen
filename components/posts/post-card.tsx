'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { UsageMessage } from '@/components/usage/usage-message';
import { useAtLimit } from '@/components/usage/usage-provider';
import type { Flag, Post } from '@/lib/posts/batch';
import type { PostEdit } from '@/lib/posts/edit';
import { PostEditor } from './post-editor';
import { type ImageState, NewImageLink, PostImage, StoryLink } from './post-image';

// One suggestion, top to bottom as the owner uses it
// (docs/specs/posts/suggestions, "A suggestion"): the post image, the text as
// it will be pasted, plain-word warnings, "Edit the text" and "Create new
// image", the two steps to take it away, and the story image behind a small
// link. No type label, number or image description.

// What's worth a word to the owner: a price, a duration or a word Instagram
// may refuse. The first-line check isn't shown.
const SHOWN_FLAGS: Flag['kind'][] = ['price', 'duration', 'banned'];

export function PostCard({
  post,
  cta,
  image,
  flags = post.unchecked,
  onSave,
  onRewrite,
  busy = false,
  editBusy = busy,
  translation,
  takeAway,
}: {
  post: Post;
  cta: string;
  image?: { state: ImageState; onRetry?: () => void; onNewImage?: (hint: string) => void };
  // What to check before posting; an edited post's follow today's details.
  flags?: Flag[];
  // No `onSave` (a suggestion still streaming in) means no "Edit the text".
  onSave?: (edit: PostEdit) => void;
  // "Rewrite this one too", on an edited suggestion that is out of date.
  onRewrite?: () => void;
  busy?: boolean;
  // Only a step that replaces the words holds "Edit the text"; images don't.
  editBusy?: boolean;
  translation?: ReactNode;
  takeAway?: ReactNode;
}) {
  const t = useTranslations('posts');
  const [editing, setEditing] = useState(false);
  const state = image?.state;
  const shown = flags.filter((flag) => SHOWN_FLAGS.includes(flag.kind));
  const canRemake =
    state?.kind === 'ready' ||
    (state?.kind === 'failed' && state.code !== 'offline' && state.code !== 'images_off');
  const remaking = state?.kind === 'making' || (state?.kind === 'ready' && !!state.making);
  const newImageLimit = useAtLimit('newImages');
  return (
    <article className="flex flex-col gap-3 rounded-control border border-edge bg-field px-4 py-3">
      {image && <PostImage state={image.state} altText={post.altText} onRetry={image.onRetry} />}
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
          <p className="whitespace-pre-line text-[15px] leading-normal text-ink">{post.caption}</p>
          {translation}
          {cta && <p className="mt-3 text-[15px] leading-normal text-ink">{cta}</p>}
          {post.hashtags.length > 0 && (
            <p className="mt-3 text-[15px] text-accent">
              {post.hashtags.map((tag) => `#${tag}`).join(' ')}
            </p>
          )}
        </div>
      )}
      {shown.map((flag) => (
        <p
          key={`${flag.kind}:${flag.text}`}
          role="note"
          className="rounded-control bg-accent-tint px-3 py-2 text-[13px] text-accent-tint-ink"
        >
          {t(`flags.${flag.kind}`, { text: flag.text })}
        </p>
      ))}
      {!editing && (onSave || (image?.onNewImage && canRemake)) && (
        <div className="flex flex-wrap items-center justify-between gap-x-4">
          {onSave && (
            <button
              type="button"
              className="inline-flex min-h-11 items-center text-[15px] font-medium text-accent underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
              onClick={() => setEditing(true)}
              disabled={editBusy}
            >
              {t('editText')}
            </button>
          )}
          {image?.onNewImage && canRemake && (
            <NewImageLink onMake={image.onNewImage} disabled={remaking || newImageLimit !== null} />
          )}
        </div>
      )}
      {!editing && image?.onNewImage && canRemake && newImageLimit && (
        <p className="text-[13px] text-error">
          <UsageMessage code={newImageLimit} action="newImages" />
        </p>
      )}
      {onRewrite && (
        <Button type="button" onClick={onRewrite} disabled={busy}>
          {t('rewriteOne')}
        </Button>
      )}
      {takeAway}
      {state?.kind === 'ready' && <StoryLink image={state.image} altText={post.altText} />}
    </article>
  );
}

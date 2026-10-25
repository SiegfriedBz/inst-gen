'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Flag, Post } from '@/lib/posts/batch';
import type { PostEdit } from '@/lib/posts/edit';
import { PostEditor } from './post-editor';
import { type ImageState, PostImage } from './post-image';

// One post as the owner reads, edits and takes it away, top to bottom as in
// the mockup the owner reviewed (docs/specs/posts/editor-download, "Where
// things are"): image, type and number, the words, what to check, "Edit",
// then the take-away buttons. The image prompt isn't shown.
export function PostCard({
  post,
  cta,
  number,
  anchorId,
  image,
  flags = post.unchecked,
  onSave,
  onRewrite,
  busy = false,
  translation,
  takeAway,
}: {
  post: Post;
  cta: string;
  // "Post 1"…: the order to post them in.
  number?: number;
  anchorId?: string;
  image?: { state: ImageState; onRetry?: () => void; onNewImage?: (hint: string) => void };
  // What to check before posting; an edited post's follow today's details.
  flags?: Flag[];
  // No `onSave` (a post still streaming in) means no "Edit".
  onSave?: (edit: PostEdit) => void;
  // "Rewrite this one too", on an edited post that is out of date.
  onRewrite?: () => void;
  busy?: boolean;
  translation?: ReactNode;
  takeAway?: ReactNode;
}) {
  const t = useTranslations('posts');
  const [editing, setEditing] = useState(false);
  return (
    <article id={anchorId} className="rounded-control border border-edge bg-field px-4 py-3">
      {image && (
        <div className="mb-3">
          <PostImage state={image.state} altText={post.altText} onRetry={image.onRetry} />
        </div>
      )}
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-medium text-accent">
          {t(`types.${post.type}`)}
          {post.edited && (
            <span className="ml-1.5 font-normal text-ink-secondary">{t('edit.edited')}</span>
          )}
        </p>
        {number !== undefined && (
          <p className="text-[13px] text-ink-secondary">{t('number', { n: number })}</p>
        )}
      </div>
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
        <>
          <p className="mt-2 whitespace-pre-line text-[15px] leading-normal text-ink">
            {post.caption}
          </p>
          {translation}
          {cta && <p className="mt-3 text-[15px] leading-normal text-ink">{cta}</p>}
          {post.hashtags.length > 0 && (
            <p className="mt-3 text-[15px] text-accent">
              {post.hashtags.map((tag) => `#${tag}`).join(' ')}
            </p>
          )}
          <p className="mt-3 text-[13px] text-ink-secondary">{t('imageDescription')}</p>
          <p className="text-[15px] leading-normal text-ink">{post.altText}</p>
        </>
      )}
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
      {onSave && !editing && (
        <button
          type="button"
          className="mt-3 py-1.5 text-[15px] font-medium text-accent underline disabled:opacity-60"
          onClick={() => setEditing(true)}
          disabled={busy}
        >
          {t('edit.edit')}
        </button>
      )}
      {onRewrite && (
        <Button type="button" className="mt-3" onClick={onRewrite} disabled={busy}>
          {t('rewriteOne')}
        </Button>
      )}
      {takeAway}
    </article>
  );
}

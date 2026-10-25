'use client';

import { useTranslations } from 'next-intl';
import { Dialog as SheetPrimitive } from 'radix-ui';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { IMAGE_HINT_CHARS, type ImageErrorCode } from '@/lib/posts/image';
import type { SavedImage } from '@/lib/posts/image-store';
import { useObjectUrl } from './object-url';

// One suggestion's image on its card (docs/specs/posts/generate-images, "On
// the screen"): a placeholder while it is made, the 4:5 post crop once saved,
// or why it couldn't be made. "Create new image", with the owner's optional
// hint, keeps the old one on the card until it is saved
// (docs/specs/posts/editor-download, "A new image"); it and "See the story
// image" are links the card places (docs/specs/posts/suggestions).

type ImageFailure = ImageErrorCode | 'no_space' | 'offline';

export type ImageState =
  | { kind: 'off' }
  | { kind: 'none' }
  | { kind: 'making' }
  // `making` while a new image is made; `failure` when it couldn't be.
  | { kind: 'ready'; image: SavedImage; making?: boolean; failure?: ImageFailure }
  | { kind: 'failed'; code: ImageFailure };

const LINK =
  'inline-flex min-h-11 items-center text-[15px] font-medium text-accent underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60';

export function NewImageLink({
  onMake,
  disabled,
}: {
  onMake: (hint: string) => void;
  disabled: boolean;
}) {
  const t = useTranslations('posts.images');
  const id = useId();
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState('');
  if (!open) {
    return (
      <button type="button" className={LINK} onClick={() => setOpen(true)} disabled={disabled}>
        {t('newImage')}
      </button>
    );
  }
  return (
    <div className="flex w-full flex-col gap-2">
      <Label htmlFor={id}>{t('hintLabel')}</Label>
      <Input
        id={id}
        maxLength={IMAGE_HINT_CHARS}
        placeholder={t('hintPlaceholder')}
        value={hint}
        onChange={(e) => setHint(e.target.value)}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          className="border border-edge bg-field text-ink"
          onClick={() => {
            setOpen(false);
            setHint('');
          }}
        >
          {t('cancel')}
        </Button>
        <Button
          type="button"
          onClick={() => {
            setOpen(false);
            setHint('');
            onMake(hint);
          }}
        >
          {t('makeIt')}
        </Button>
      </div>
    </div>
  );
}

function Ready({
  image,
  altText,
  making = false,
  failure,
}: {
  image: SavedImage;
  altText: string;
  making?: boolean;
  failure?: ImageFailure;
}) {
  const t = useTranslations('posts.images');
  const post = useObjectUrl(image.post);
  return (
    <>
      <div className="relative">
        {post && (
          // biome-ignore lint/performance/noImgElement: a blob URL from the phone's store; next/image has nothing to optimise
          <img
            src={post}
            alt={altText}
            className={`aspect-[4/5] w-full rounded-control object-cover${making ? ' opacity-40' : ''}`}
          />
        )}
        {making && (
          <p className="absolute inset-0 flex items-center justify-center text-[15px] font-medium text-ink">
            {t('making')}
          </p>
        )}
      </div>
      {failure && <p className="mt-2 text-[13px] text-error">{t(`errors.${failure}`)}</p>}
    </>
  );
}

// The 9:16 story full screen, from a small link at the bottom of the card.
export function StoryLink({ image, altText }: { image: SavedImage; altText: string }) {
  const t = useTranslations('posts.images');
  const [open, setOpen] = useState(false);
  const story = useObjectUrl(open ? image.story : null);
  return (
    <>
      <button
        type="button"
        className="mx-auto inline-flex min-h-11 items-center text-[13px] text-ink-secondary underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-accent"
        onClick={() => setOpen(true)}
      >
        {t('seeStory')}
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="inset-0 h-dvh max-h-none rounded-none bg-black p-0">
          <SheetTitle className="sr-only">{t('seeStory')}</SheetTitle>
          <SheetPrimitive.Description className="sr-only">{altText}</SheetPrimitive.Description>
          {story && (
            // biome-ignore lint/performance/noImgElement: a blob URL from the phone's store; next/image has nothing to optimise
            <img src={story} alt={altText} className="h-full w-full object-contain" />
          )}
          <Button type="button" className="absolute top-3 right-3" onClick={() => setOpen(false)}>
            {t('close')}
          </Button>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function PostImage({
  state,
  altText,
  onRetry,
}: {
  state: ImageState;
  altText: string;
  onRetry?: () => void;
}) {
  const t = useTranslations('posts.images');
  if (state.kind === 'ready') {
    return (
      <Ready image={state.image} altText={altText} making={state.making} failure={state.failure} />
    );
  }
  if (state.kind === 'off' || (state.kind === 'failed' && state.code === 'images_off')) {
    return <p className="text-[13px] text-ink-secondary">{t('off')}</p>;
  }
  const retry = onRetry && (
    <Button type="button" className="mt-2" onClick={onRetry}>
      {t('retry')}
    </Button>
  );
  if (state.kind === 'none') return retry ?? null;
  return (
    <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 rounded-control bg-accent-tint px-4 text-center text-[15px] text-accent-tint-ink">
      <p>{state.kind === 'making' ? t('making') : t(`errors.${state.code}`)}</p>
      {/* An offline image carries on by itself when the phone is back. */}
      {state.kind === 'failed' && state.code !== 'offline' && retry}
    </div>
  );
}

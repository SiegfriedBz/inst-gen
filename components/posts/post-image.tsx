'use client';

import { useTranslations } from 'next-intl';
import { Dialog as SheetPrimitive } from 'radix-ui';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import type { ImageErrorCode } from '@/lib/posts/image';
import type { SavedImage } from '@/lib/posts/image-store';

// One post's image on its card (docs/specs/posts/generate-images, "On the
// screen"): a placeholder while it is made, the 4:5 post crop once saved,
// with the 9:16 story full screen on tap, or why it couldn't be made.

export type ImageState =
  | { kind: 'off' }
  | { kind: 'none' }
  | { kind: 'making' }
  | { kind: 'ready'; image: SavedImage }
  | { kind: 'failed'; code: ImageErrorCode | 'no_space' | 'offline' };

function useObjectUrl(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) return;
    const made = URL.createObjectURL(blob);
    setUrl(made);
    return () => URL.revokeObjectURL(made);
  }, [blob]);
  return url;
}

function Ready({ image, altText }: { image: SavedImage; altText: string }) {
  const t = useTranslations('posts.images');
  const [open, setOpen] = useState(false);
  const post = useObjectUrl(image.post);
  const story = useObjectUrl(open ? image.story : null);
  return (
    <>
      {post && (
        // biome-ignore lint/performance/noImgElement: a blob URL from the phone's store; next/image has nothing to optimise
        <img
          src={post}
          alt={altText}
          className="aspect-[4/5] w-full rounded-control object-cover"
        />
      )}
      <Button type="button" className="mt-2" onClick={() => setOpen(true)}>
        {t('seeStory')}
      </Button>
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
  if (state.kind === 'ready') return <Ready image={state.image} altText={altText} />;
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
    <div className="flex aspect-[4/5] w-full flex-col items-center justify-center rounded-control bg-accent-tint px-4 text-center text-[15px] text-accent-tint-ink">
      <p>{state.kind === 'making' ? t('making') : t(`errors.${state.code}`)}</p>
      {/* An offline image carries on by itself when the phone is back. */}
      {state.kind === 'failed' && state.code !== 'offline' && retry}
    </div>
  );
}

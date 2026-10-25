'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import type { Post } from '@/lib/posts/batch';
import { postText } from '@/lib/posts/edit';
import type { SavedImage } from '@/lib/posts/image-store';
import { copyToClipboard, imageFileName, saveImageFiles } from '@/lib/posts/take-away';

// The two steps that take a suggestion away (docs/specs/posts/suggestions, "A
// suggestion"): both images to the phone in one share sheet, then the text to
// the clipboard, with how to post them in Instagram. Without images, only the
// text, unnumbered.
export function TakeAway({
  post,
  cta,
  image,
  imagesOn,
  name,
  createdAt,
  attempt,
  n,
}: {
  post: Post;
  cta: string;
  // Only once the image is saved and no new one is being made.
  image?: SavedImage;
  imagesOn: boolean;
  name: string;
  createdAt: string;
  attempt: number;
  n: number;
}) {
  const t = useTranslations('posts');
  const [copied, setCopied] = useState(false);
  const [byHand, setByHand] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);
  const text = postText(post, cta);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2_000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    if (await copyToClipboard(text)) setCopied(true);
    else setByHand(true);
  }

  function save() {
    if (!image) return;
    void saveImageFiles(
      (['post', 'story'] as const).map((kind) => ({
        blob: image[kind],
        name: imageFileName(name, createdAt, attempt, n, kind),
      })),
    );
  }

  const step = (number: number) => (
    <span
      aria-hidden="true"
      className="mr-2 inline-flex size-6 items-center justify-center rounded-full bg-black/10 text-[13px]"
    >
      {number}
    </span>
  );

  return (
    <div className="flex flex-col gap-2">
      {imagesOn && (
        <Button type="button" onClick={save} disabled={!image}>
          {step(1)}
          {t('saveImages')}
        </Button>
      )}
      <Button
        type="button"
        className={imagesOn ? 'border border-edge bg-field text-ink' : undefined}
        onClick={copy}
      >
        {imagesOn && step(2)}
        {copied ? t('takeAway.copied') : t('copyText')}
      </Button>
      <p className="text-[13px] text-ink-secondary">{imagesOn ? t('howTo') : t('howToTextOnly')}</p>
      <Sheet open={byHand} onOpenChange={setByHand}>
        <SheetContent
          className="flex flex-col gap-3 p-4"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            box.current?.focus();
            box.current?.select();
          }}
        >
          <SheetTitle>{t('takeAway.copyHere')}</SheetTitle>
          <textarea
            ref={box}
            readOnly
            value={text}
            rows={10}
            className="w-full rounded-control border border-edge bg-field p-3 text-[15px] text-ink"
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

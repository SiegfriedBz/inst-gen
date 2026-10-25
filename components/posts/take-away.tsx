'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import type { Post } from '@/lib/posts/batch';
import { postText } from '@/lib/posts/edit';
import type { SavedImage } from '@/lib/posts/image-store';
import { copyToClipboard, imageFileName, saveImageFiles } from '@/lib/posts/take-away';

// The last buttons on a card (docs/specs/posts/editor-download, "Taking it
// away"): "Copy caption" as the main one, then the post and story images.
// A story has no caption box on Instagram, so its image is all it takes.
export function TakeAway({
  post,
  cta,
  image,
  name,
  createdAt,
  number,
}: {
  post: Post;
  cta: string;
  image?: SavedImage;
  name: string;
  createdAt: string;
  number: number;
}) {
  const t = useTranslations('posts.takeAway');
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

  const save = (kind: 'post' | 'story') => () => {
    if (!image) return;
    void saveImageFiles([
      { blob: image[kind], name: imageFileName(name, createdAt, 1, number, kind) },
    ]);
  };

  return (
    <div className="mt-3 flex flex-col gap-2">
      <Button type="button" onClick={copy}>
        {copied ? t('copied') : t('copy')}
      </Button>
      {image && (
        <div className="flex gap-2">
          <Button
            type="button"
            className="border border-edge bg-field text-ink"
            onClick={save('post')}
          >
            {t('savePost')}
          </Button>
          <Button
            type="button"
            className="border border-edge bg-field text-ink"
            onClick={save('story')}
          >
            {t('saveStory')}
          </Button>
        </div>
      )}
      <Sheet open={byHand} onOpenChange={setByHand}>
        <SheetContent
          className="flex flex-col gap-3 p-4"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            box.current?.focus();
            box.current?.select();
          }}
        >
          <SheetTitle>{t('copyHere')}</SheetTitle>
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

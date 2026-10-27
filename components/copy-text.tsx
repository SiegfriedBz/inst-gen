'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { copyToClipboard } from '@/lib/posts/take-away';

// "Copy the text" (docs/specs/posts/editor-download): "Copied" for 2 s, or,
// when the phone refuses the clipboard, a sheet with the text selected to copy
// by hand. Shared by a suggestion and a review reply. `onCopied` hears of
// both: the text the owner copies by hand counts as copied.
export function CopyText({
  text,
  label,
  className,
  onCopied,
}: {
  text: string;
  label: React.ReactNode;
  className?: string;
  onCopied?: () => void;
}) {
  const t = useTranslations('posts');
  const [copied, setCopied] = useState(false);
  const [byHand, setByHand] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2_000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    if (await copyToClipboard(text)) setCopied(true);
    else setByHand(true);
    onCopied?.();
  }

  return (
    <>
      <Button type="button" className={className} onClick={copy}>
        {copied ? t('takeAway.copied') : label}
      </Button>
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
    </>
  );
}

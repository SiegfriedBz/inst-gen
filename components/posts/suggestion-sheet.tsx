'use client';

import { X } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

// One suggestion opened from its tile (docs/specs/platform/friendlier-home,
// "Tapping a tile opens the suggestion"): a sheet from the bottom, a small
// title and a close button, and the suggestion scrolling, its buttons in its
// parts (docs/specs/posts/story-text). Open while mounted; the caller decides
// when.
export function SuggestionSheet({
  title,
  onClose,
  onCloseFocus,
  children,
}: {
  title: string;
  onClose: () => void;
  // Where focus goes once it's closed: the tile it came from.
  onCloseFocus?: () => void;
  children: ReactNode;
}) {
  const t = useTranslations('posts.images');
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        aria-describedby={undefined}
        className="h-[94dvh] max-h-none"
        onCloseAutoFocus={(event) => {
          if (!onCloseFocus) return;
          event.preventDefault();
          onCloseFocus();
        }}
      >
        <div className="flex items-center justify-between gap-2 pt-2 pr-3 pl-5">
          <SheetTitle className="text-[13px] font-normal tracking-normal text-ink-secondary">
            {title}
          </SheetTitle>
          <button
            type="button"
            aria-label={t('close')}
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-control text-ink-secondary outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X aria-hidden="true" size={22} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

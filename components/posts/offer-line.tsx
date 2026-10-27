'use client';

import { X } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';
import type { Offer } from '@/lib/posts/offer';
import { useOfferDate } from './offer-sheet';

// Today's offer once set (docs/specs/posts/special-offer, "The button"): its
// line reopens the sheet, the cross removes it.
export function OfferLine({
  offer,
  onOpen,
  onRemove,
}: {
  offer: Offer;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const t = useTranslations('posts.offer');
  const offerDate = useOfferDate();
  const what =
    offer.kind === 'discount'
      ? t('discountShort', { percent: offer.percent })
      : t('freeShort', { gift: offer.gift });
  return (
    <div className="flex min-h-11 items-stretch rounded-control bg-accent-tint text-accent-tint-ink">
      <button
        type="button"
        onClick={onOpen}
        className="press min-w-0 flex-1 rounded-control px-4 py-2.5 text-left text-[15px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {t('line', {
          what,
          count: t('count', { n: offer.treatments.length }),
          date: offerDate(offer.until),
        })}
      </button>
      <button
        type="button"
        aria-label={t('remove')}
        onClick={onRemove}
        className="flex size-11 shrink-0 items-center justify-center rounded-control outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <X aria-hidden="true" size={20} />
      </button>
    </div>
  );
}

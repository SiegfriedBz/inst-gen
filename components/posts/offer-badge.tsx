'use client';

import { useTranslations } from 'next-intl';
import type { Offer } from '@/lib/posts/offer';
import { useOfferDate } from './offer-sheet';

// Marks a suggestion that carries the special offer
// (docs/specs/posts/special-offer, "Which posts carry it"): the app's own
// label, never on the downloaded images nor in the copied text.
export function offerBadgeText(
  t: (key: string, values?: Record<string, number>) => string,
  offer: Offer,
) {
  return offer.kind === 'discount'
    ? t('badgeDiscount', { percent: offer.percent })
    : t('badgeFree');
}

export function OfferBadge({ offer, until = false }: { offer: Offer; until?: boolean }) {
  const t = useTranslations('posts.offer');
  const offerDate = useOfferDate();
  const label = (
    <span className="rounded-control bg-accent-tint px-2 py-0.5 text-[12px] font-medium text-accent-tint-ink">
      {offerBadgeText(t, offer)}
    </span>
  );
  if (!until) return label;
  return (
    <p className="flex flex-wrap items-center gap-2 text-[13px] text-ink-secondary">
      {label}
      <span>{t('untilDate', { date: offerDate(offer.until) })}</span>
    </p>
  );
}

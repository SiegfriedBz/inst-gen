'use client';

import { useTranslations } from 'next-intl';
import { isOver, type Offer } from '@/lib/posts/offer';
import { useOfferDate } from './offer-sheet';

// Marks a suggestion that carries the special offer
// (docs/specs/posts/special-offer, "Which posts carry it"): the app's own
// label, never on the downloaded images nor in the copied text. Past the
// offer's last day, "Offer ended", in grey (docs/specs/posts/two-days,
// amended 2026-11-23).
export function offerBadgeText(
  t: (key: string, values?: Record<string, number>) => string,
  offer: Offer,
  now: Date = new Date(),
) {
  if (isOver(offer, now)) return t('badgeEnded');
  return offer.kind === 'discount'
    ? t('badgeDiscount', { percent: offer.percent })
    : t('badgeFree');
}

const LIVE =
  'rounded-control bg-accent-tint px-2 py-0.5 text-[12px] font-medium text-accent-tint-ink';
const ENDED =
  'rounded-control bg-field-muted px-2 py-0.5 text-[12px] font-medium text-ink-secondary';

export function OfferBadge({
  offer,
  until = false,
  now = new Date(),
}: {
  offer: Offer;
  until?: boolean;
  now?: Date;
}) {
  const t = useTranslations('posts.offer');
  const offerDate = useOfferDate();
  const over = isOver(offer, now);
  const label = <span className={over ? ENDED : LIVE}>{offerBadgeText(t, offer, now)}</span>;
  if (!until) return label;
  const date = offerDate(offer.until);
  return (
    <p className="flex flex-wrap items-center gap-2 text-[13px] text-ink-secondary">
      {label}
      <span>{over ? t('lastDayDate', { date }) : t('untilDate', { date })}</span>
    </p>
  );
}

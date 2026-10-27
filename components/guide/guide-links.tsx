'use client';

import { ArrowLeft, Question } from '@phosphor-icons/react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

// The ways into and out of the owner guide (docs/specs/guide/owner-guide,
// "Where it lives"), client-side so they switch language with the screen.

const linkClass =
  'inline-flex min-h-11 shrink-0 items-center gap-1 rounded-control px-1 text-[13px] font-medium text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent';

// An icon only, named "Guide" (docs/specs/platform/friendlier-home, "The header").
export function GuideLink() {
  const t = useTranslations('guide');
  return (
    <Link
      href="/guide"
      aria-label={t('link')}
      title={t('link')}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-control text-ink-secondary outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <Question aria-hidden="true" size={22} />
    </Link>
  );
}

export function BackLink() {
  const t = useTranslations('guide');
  return (
    <Link href="/" className={linkClass}>
      <ArrowLeft aria-hidden="true" size={16} weight="bold" />
      {t('back')}
    </Link>
  );
}

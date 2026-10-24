'use client';

import { useTranslations } from 'next-intl';
import { type SourceKind, sourceOf } from '@/lib/brand/display';

// The small muted line under a fact saying where it came from, so the owner
// can tell what her site says from what the app guessed.
export function SourceNote({
  source,
  kind = 'fact',
  siteUrl,
}: {
  source?: string;
  kind?: SourceKind;
  siteUrl?: string;
}) {
  const t = useTranslations('brand.source');
  const shown = sourceOf(source, kind, siteUrl);
  if (!shown) return null;
  const className = 'mt-0.5 block text-xs text-ink-secondary';
  if (shown.kind === 'page' || shown.kind === 'home' || shown.kind === 'elsewhere') {
    return (
      <a
        href={shown.href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${className} underline-offset-4 hover:underline`}
      >
        {shown.kind === 'page'
          ? t('page', { path: shown.path })
          : shown.kind === 'elsewhere'
            ? t('elsewhere', { host: shown.host })
            : t('home')}
      </a>
    );
  }
  const text =
    shown.kind === 'owner' ? t('owner') : shown.kind === 'site' ? t('site') : t(shown.as);
  return <span className={className}>{text}</span>;
}

'use client';

import { CircleNotch } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';

// The top of the home while a read runs: the address, a progress animation
// (the read has no measurable progress), the "keep open" line and Stop.
export function Reading({ url, onStop }: { url: string; onStop: () => void }) {
  const t = useTranslations('brand.home');
  return (
    <div className="mb-4 flex flex-col gap-1">
      <p className="truncate text-[13px] text-ink-secondary">{url}</p>
      <p className="flex items-center gap-2 text-[17px] font-medium">
        <CircleNotch aria-hidden size={20} className="animate-spin text-accent" />
        {t('reading')}
      </p>
      <p className="text-[13px] text-ink-secondary">{t('keepOpen')}</p>
      <button
        type="button"
        onClick={onStop}
        className="min-h-11 self-start text-[15px] font-medium text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {t('stop')}
      </button>
    </div>
  );
}

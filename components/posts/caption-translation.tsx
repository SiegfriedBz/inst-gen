'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { UsageMessage } from '@/components/usage/usage-message';
import { LOCALE_NAMES } from '@/lib/i18n/locale';
import { TRANSLATE_LOCALES, type TranslateLocale } from '@/lib/posts/translate';
import { getTranslation } from '@/lib/posts/translate-client';
import { isUsageCode, type UsageCode } from '@/lib/usage/codes';

// "Show in Tiếng Việt" or "Show in Bahasa Indonesia" under a caption
// (docs/specs/posts/editor-download, "The owner's-language view"): read-only,
// while what gets posted stays in English. Nothing is read or asked for until
// the owner taps, so the list stays light on a slow phone. No button in English.

type View =
  | { kind: 'closed' }
  | { kind: 'loading' }
  | { kind: 'open'; text: string }
  | { kind: 'failed'; code: 'model_busy' | 'model_timeout' | 'model_failed' | UsageCode };

function isTranslateLocale(locale: string): locale is TranslateLocale {
  return (TRANSLATE_LOCALES as readonly string[]).includes(locale);
}

// The story text has its own link, under it; one request answers both
// (docs/specs/posts/story-text, "The owner's language").
export function CaptionTranslation({
  ownerId,
  batchId,
  postId,
  caption,
  story,
  part = 'caption',
}: {
  ownerId: string;
  batchId: string;
  postId: string;
  caption: string;
  story?: string;
  part?: 'caption' | 'story';
}) {
  const t = useTranslations('posts.translate');
  const locale = useLocale();
  const [view, setView] = useState<View>({ kind: 'closed' });
  if (!isTranslateLocale(locale)) return null;
  const language = LOCALE_NAMES[locale];

  async function show(screenLocale: TranslateLocale) {
    setView({ kind: 'loading' });
    const result = await getTranslation({
      ownerId,
      batchId,
      postId,
      caption,
      story,
      locale: screenLocale,
    });
    const text = result.ok && (part === 'story' ? result.story : result.text);
    if (result.ok && text) {
      setView({ kind: 'open', text });
    } else if (result.ok) {
      setView({ kind: 'failed', code: 'model_failed' });
    } else if (result.code === 'signedOut') {
      window.location.assign('/enter');
    } else {
      const code =
        result.code === 'model_busy' || result.code === 'model_timeout' || isUsageCode(result.code)
          ? result.code
          : 'model_failed';
      setView({ kind: 'failed', code });
    }
  }

  const open = view.kind === 'open';
  return (
    <div className="mt-2">
      <button
        type="button"
        className="py-1.5 text-[15px] font-medium text-accent underline disabled:opacity-60"
        disabled={view.kind === 'loading'}
        onClick={() => (open ? setView({ kind: 'closed' }) : void show(locale))}
      >
        {open ? t('hide') : t('show', { language })}
      </button>
      {open && (
        <div className="mt-1 rounded-control bg-accent-tint px-3 py-2 text-[15px] text-accent-tint-ink">
          <p className="text-[13px]">{t('label', { language })}</p>
          <p className="mt-1 whitespace-pre-line">{view.text}</p>
        </div>
      )}
      {view.kind === 'failed' && (
        <p className="mt-1 text-[13px] text-error">
          {isUsageCode(view.code) ? (
            <UsageMessage code={view.code} action="translations" />
          ) : (
            t(`errors.${view.code}`)
          )}
        </p>
      )}
    </div>
  );
}

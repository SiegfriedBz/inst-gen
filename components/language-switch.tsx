'use client';

import { useLocale, useTranslations } from 'next-intl';
import { saveLocale, setLocale } from '@/app/language/actions';
import { LOCALE_NAMES, type Locale } from '@/lib/i18n/locale';
import { useSwitchLocale } from './locale-provider';

// The three languages at the top right of every screen, as short codes: full
// names don't fit beside the logo at 360px (docs/specs/platform/home-tabs).
// Each code carries its language's own name for screen readers. With
// JavaScript a tap switches the screen at once and saves the choice in the
// background (docs/specs/posts/suggestions); without it, the plain form posts
// and comes back to the same screen.
const SWITCH_ORDER = ['en', 'vi', 'id'] as const satisfies readonly Locale[];

// The latest choice not yet saved: a save that fails (often offline on these
// phones) is tried again, for the latest choice only, once the phone is back.
let unsaved: Locale | null = null;

function persist(locale: Locale): void {
  unsaved = locale;
  saveLocale(locale).then(
    () => {
      if (unsaved === locale) unsaved = null;
    },
    () => {
      window.addEventListener(
        'online',
        () => {
          if (unsaved) persist(unsaved);
        },
        { once: true },
      );
    },
  );
}

export function LanguageSwitch({ returnTo }: { returnTo: string }) {
  const current = useLocale();
  const t = useTranslations('language');
  const switchTo = useSwitchLocale();
  return (
    <nav aria-label={t('label')} className="shrink-0">
      <form
        action={setLocale}
        className="flex overflow-hidden rounded-control border border-edge text-[13px] font-medium"
      >
        <input type="hidden" name="returnTo" value={returnTo} />
        {SWITCH_ORDER.map((code) =>
          code === current ? (
            <span
              key={code}
              lang={code}
              aria-current="true"
              title={LOCALE_NAMES[code]}
              className="inline-flex min-h-11 min-w-10 items-center justify-center bg-accent px-2 text-on-accent"
            >
              <span className="sr-only">{LOCALE_NAMES[code]}</span>
              <span aria-hidden="true">{code.toUpperCase()}</span>
            </span>
          ) : (
            <button
              key={code}
              type="submit"
              name="locale"
              value={code}
              lang={code}
              aria-label={LOCALE_NAMES[code]}
              title={LOCALE_NAMES[code]}
              onClick={(event) => {
                event.preventDefault();
                switchTo(code);
                persist(code);
              }}
              className="inline-flex min-h-11 min-w-10 items-center justify-center px-2 text-ink-secondary outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
            >
              {code.toUpperCase()}
            </button>
          ),
        )}
      </form>
    </nav>
  );
}

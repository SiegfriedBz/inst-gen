'use client';

import { Check, Globe } from '@phosphor-icons/react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { saveLocale, setLocale } from '@/app/language/actions';
import { LOCALE_NAMES, type Locale } from '@/lib/i18n/locale';
import { useSwitchLocale } from './locale-provider';

// One button at the top right of every screen, the current language's code,
// opening the three languages by their own names (docs/specs/platform/
// friendlier-home, "The language button"). With JavaScript a tap switches the
// screen at once and saves the choice in the background
// (docs/specs/posts/suggestions); without it, the details element opens by
// itself and the plain form posts and comes back to the same screen.
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
  const current = useLocale() as Locale;
  const t = useTranslations('language');
  const switchTo = useSwitchLocale();
  const details = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);

  // The element holds whether it's open: the browser toggles it, with or
  // without JavaScript. Escape and a tap outside close it too.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !details.current?.open) return;
      details.current.open = false;
      summary.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (details.current?.open && !details.current.contains(event.target as Node)) {
        details.current.open = false;
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, []);

  return (
    <nav aria-label={t('label')} className="relative shrink-0">
      <details ref={details}>
        <summary
          ref={summary}
          aria-label={t('button', { name: LOCALE_NAMES[current] })}
          title={LOCALE_NAMES[current]}
          className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-control px-2 text-[14px] font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-details-marker]:hidden"
        >
          <Globe aria-hidden="true" size={20} className="text-ink-secondary" />
          <span aria-hidden="true">{current.toUpperCase()}</span>
        </summary>
        <form
          action={setLocale}
          className="absolute top-full right-0 z-20 mt-1 flex w-56 flex-col rounded-control border border-edge bg-field p-1.5 text-[15px]"
        >
          <input type="hidden" name="returnTo" value={returnTo} />
          {SWITCH_ORDER.map((code) =>
            code === current ? (
              <span
                key={code}
                lang={code}
                aria-current="true"
                className="flex min-h-12 items-center justify-between rounded-control bg-accent-tint px-3 font-medium text-accent-tint-ink"
              >
                {LOCALE_NAMES[code]}
                <Check aria-hidden="true" size={18} weight="bold" />
              </span>
            ) : (
              <button
                key={code}
                type="submit"
                name="locale"
                value={code}
                lang={code}
                onClick={(event) => {
                  event.preventDefault();
                  if (details.current) details.current.open = false;
                  switchTo(code);
                  persist(code);
                }}
                className="flex min-h-12 items-center rounded-control px-3 text-left text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
              >
                {LOCALE_NAMES[code]}
              </button>
            ),
          )}
        </form>
      </details>
    </nav>
  );
}

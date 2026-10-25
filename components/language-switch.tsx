import { getLocale, getTranslations } from 'next-intl/server';
import { setLocale } from '@/app/language/actions';
import { LOCALE_NAMES, type Locale } from '@/lib/i18n/locale';

// The three languages at the top right of every screen, as short codes: full
// names don't fit beside the logo at 360px (docs/specs/platform/home-tabs).
// Each code carries its language's own name for screen readers. A plain
// form, so it works without JavaScript.
const SWITCH_ORDER = ['en', 'vi', 'id'] as const satisfies readonly Locale[];

export async function LanguageSwitch({ returnTo }: { returnTo: string }) {
  const current = await getLocale();
  const t = await getTranslations('language');
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

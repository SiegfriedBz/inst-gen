import { getLocale, getTranslations } from 'next-intl/server';
import { setLocale } from '@/app/language/actions';
import { LOCALE_NAMES, LOCALES } from '@/lib/i18n/locale';

// The row of languages at the bottom of every screen. A plain form, so it
// works without JavaScript.
export async function LanguageSwitch({ returnTo }: { returnTo: string }) {
  const current = await getLocale();
  const t = await getTranslations('language');
  return (
    <nav aria-label={t('label')} className="mt-auto pt-10">
      <form action={setLocale} className="-mx-2 flex flex-wrap">
        <input type="hidden" name="returnTo" value={returnTo} />
        {LOCALES.map((code) =>
          code === current ? (
            <span
              key={code}
              lang={code}
              aria-current="true"
              className="inline-flex min-h-11 items-center px-2 text-[13px] font-medium text-ink"
            >
              {LOCALE_NAMES[code]}
            </span>
          ) : (
            <button
              key={code}
              type="submit"
              name="locale"
              value={code}
              lang={code}
              className="inline-flex min-h-11 items-center rounded-control px-2 text-[13px] text-ink-secondary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent"
            >
              {LOCALE_NAMES[code]}
            </button>
          ),
        )}
      </form>
    </nav>
  );
}

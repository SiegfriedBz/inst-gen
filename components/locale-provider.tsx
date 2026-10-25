'use client';

import { NextIntlClientProvider } from 'next-intl';
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import type { Locale } from '@/lib/i18n/locale';
import { messagesFor } from '@/lib/i18n/messages';

// The screen's language, switched on the phone at once
// (docs/specs/posts/suggestions, "A faster language switch"): the three
// message files are small, so a tap never waits on the server; the cookie is
// saved in the background by the switch.

const SwitchLocale = createContext<(locale: Locale) => void>(() => {});

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  // The page's first language, from the cookie; after that the phone's
  // choice. A later server render (each save re-renders the layout) never
  // overrides it: it may carry a choice the owner has already moved on from.
  const [locale, setLocale] = useState(initialLocale);
  const messages = useMemo(() => messagesFor(locale), [locale]);
  const switchTo = useCallback((next: Locale) => {
    setLocale(next);
    document.documentElement.lang = next;
  }, []);
  return (
    <SwitchLocale value={switchTo}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </SwitchLocale>
  );
}

export function useSwitchLocale(): (locale: Locale) => void {
  return useContext(SwitchLocale);
}

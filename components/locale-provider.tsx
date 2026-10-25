'use client';

import { NextIntlClientProvider } from 'next-intl';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
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
  const [locale, setLocale] = useState(initialLocale);
  // A server render that knows better (the cookie, after a reload) wins.
  useEffect(() => setLocale(initialLocale), [initialLocale]);
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

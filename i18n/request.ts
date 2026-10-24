import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { LOCALE_COOKIE, pickLocale } from '@/lib/i18n/locale';
import { messagesFor } from '@/lib/i18n/messages';

// The owner's saved choice, then the phone's language, then English
// (docs/specs/platform/i18n/spec.md).
export default getRequestConfig(async () => {
  const locale = pickLocale(
    (await cookies()).get(LOCALE_COOKIE)?.value,
    (await headers()).get('accept-language'),
  );
  return { locale, messages: messagesFor(locale) };
});

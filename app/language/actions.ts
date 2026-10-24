'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  isLocale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  safeReturnPath,
} from '@/lib/i18n/locale';

// The language switch: save the choice, then show the same screen again.
export async function setLocale(form: FormData): Promise<void> {
  const locale = form.get('locale');
  if (isLocale(locale)) {
    (await cookies()).set(LOCALE_COOKIE, locale, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: LOCALE_COOKIE_MAX_AGE_SECONDS,
    });
  }
  redirect(safeReturnPath(form.get('returnTo')));
}

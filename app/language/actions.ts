'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  isLocale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  safeReturnPath,
} from '@/lib/i18n/locale';

async function keep(locale: unknown): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: LOCALE_COOKIE_MAX_AGE_SECONDS,
  });
}

// The language switch without JavaScript: save the choice, then show the
// same screen again.
export async function setLocale(form: FormData): Promise<void> {
  await keep(form.get('locale'));
  redirect(safeReturnPath(form.get('returnTo')));
}

// With JavaScript the screen has already switched: only save the choice.
export async function saveLocale(locale: string): Promise<void> {
  await keep(locale);
}

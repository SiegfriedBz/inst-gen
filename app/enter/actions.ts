'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { findOwner } from '@/lib/pilot/config';
import { getPilotConfig } from '@/lib/pilot/runtime-config';
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/lib/pilot/session';
import { type SignInState, WRONG_PASSPHRASE_DELAY_MS } from './sign-in-state';

export async function signIn(prev: SignInState, form: FormData): Promise<SignInState> {
  const config = getPilotConfig();
  const input = form.get('passphrase');
  const ownerId =
    config.ok && typeof input === 'string' ? findOwner(config.config.entries, input) : null;

  if (!config.ok || !ownerId) {
    await new Promise((resolve) => setTimeout(resolve, WRONG_PASSPHRASE_DELAY_MS));
    return { error: true, attempt: prev.attempt + 1 };
  }

  (await cookies()).set(SESSION_COOKIE, await createSession(ownerId, config.config, new Date()), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  redirect('/');
}

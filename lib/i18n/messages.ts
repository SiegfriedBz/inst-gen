// The screens' strings in each language, laid over English so a string
// missing from one language shows in English instead of a blank or a key.
import en from '@/messages/en.json';
import id from '@/messages/id.json';
import vi from '@/messages/vi.json';
import type { Locale } from './locale';

export type Messages = typeof en;

export const MESSAGES: Record<Locale, unknown> = { en, id, vi };

// A copy of `base` where each string the overlay has at the same key replaces
// the base one. Anything else in the overlay is ignored.
function layOver<T>(base: T, overlay: unknown): T {
  if (typeof base === 'string') return (typeof overlay === 'string' ? overlay : base) as T;
  if (!base || typeof base !== 'object') return base;
  const layer = overlay && typeof overlay === 'object' ? (overlay as Record<string, unknown>) : {};
  return Object.fromEntries(
    Object.entries(base).map(([key, value]) => [key, layOver(value, layer[key])]),
  ) as T;
}

export function messagesFor(locale: Locale, overlay: unknown = MESSAGES[locale]): Messages {
  return layOver(en, overlay);
}

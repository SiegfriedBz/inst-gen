import { noteUsage } from '@/lib/usage/client';
import { normaliseText } from './normalise';
import { LIMITS, type Profile } from './profile';
import { SEARCH_ERROR_CODES, type SearchErrorCode } from './search/errors';
import type { SearchBody } from './search/queries';
import type { SearchAnswer } from './search/run';

// The essence search seen from the browser (docs/specs/brand/search-essence):
// what it sends, and how its answer joins the profile saved on the phone.

export type SearchOutcome =
  | { kind: 'answered'; answer: SearchAnswer }
  | { kind: 'error'; code: SearchErrorCode }
  | { kind: 'signedOut' };

export function countryOf(profile: Profile): SearchBody['country'] {
  for (const number of [profile.contact.whatsapp?.value, profile.contact.phone?.value]) {
    if (number?.startsWith('+84')) return 'VN';
    if (number?.startsWith('+62')) return 'ID';
  }
  const host = new URL(profile.siteUrl).hostname;
  if (host.endsWith('.vn')) return 'VN';
  if (host.endsWith('.id')) return 'ID';
  return null;
}

// The trade, the place and the essence's values: never the name, contact
// details or offerings. Null when there is no town or trade to search for.
export function searchBody(profile: Profile): SearchBody | null {
  const town = profile.location.town?.value.trim();
  const category = profile.category.trim();
  if (!town || !category) return null;
  const { essence } = profile;
  return {
    siteUrl: profile.siteUrl,
    category,
    town,
    area: profile.location.area?.value ?? null,
    serviceArea: profile.location.serviceArea?.value ?? null,
    country: countryOf(profile),
    essence: {
      feeling: essence.feeling,
      placeSymbols: essence.placeSymbols,
      senses: essence.senses,
      moments: essence.moments.map((m) => m.value),
      searchTerms: essence.searchTerms,
    },
  };
}

// Searched once after each read; a failed search is tried again next time.
export function needsSearch(profile: Profile): boolean {
  return profile.searchedAt === null && searchBody(profile) !== null;
}

// Search only adds: what the profile holds now (from the site or typed by the
// owner) stays first, and search items fill the places still free.
function append<T>(kept: T[], added: T[], max: number, key: (item: T) => string): T[] {
  const seen = new Set(kept.map(key));
  const out = [...kept];
  for (const item of added) {
    if (out.length >= max) break;
    const k = key(item);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

export function mergeSearch(profile: Profile, answer: SearchAnswer): Profile {
  const { essence } = profile;
  return {
    ...profile,
    essence: {
      ...essence,
      moments: append(essence.moments, answer.moments, LIMITS.moments, (m) =>
        normaliseText(m.value),
      ),
      placeSymbols: append(
        essence.placeSymbols,
        answer.placeSymbols,
        LIMITS.placeSymbols,
        normaliseText,
      ),
      searchTerms: append(
        essence.searchTerms,
        answer.searchTerms,
        LIMITS.searchTerms,
        normaliseText,
      ),
    },
    searchedAt: answer.searchedAt,
    searchPromptVersion: answer.searchPromptVersion,
  };
}

function isErrorCode(value: unknown): value is SearchErrorCode {
  return (SEARCH_ERROR_CODES as readonly unknown[]).includes(value);
}

export async function requestSearch(
  profile: Profile,
  deps: { fetch: typeof fetch; signal?: AbortSignal } = {
    fetch: (...args) => globalThis.fetch(...args),
  },
): Promise<SearchOutcome> {
  const body = searchBody(profile);
  if (!body) return { kind: 'error', code: 'search_failed' };
  try {
    const response = await deps.fetch('/api/brand/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: deps.signal,
    });
    if (response.status === 401) return { kind: 'signedOut' };
    const json: unknown = await response.json();
    if (!response.ok) {
      const code = json && typeof json === 'object' ? (json as { error?: unknown }).error : null;
      return { kind: 'error', code: isErrorCode(code) ? code : 'search_failed' };
    }
    return { kind: 'answered', answer: json as SearchAnswer };
  } catch (error) {
    if (deps.signal?.aborted) throw error;
    return { kind: 'error', code: 'search_failed' };
  } finally {
    noteUsage();
  }
}

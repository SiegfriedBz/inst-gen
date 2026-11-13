// The pilot gate's configuration: one passphrase per owner, all in
// PILOT_PASSPHRASES, and the secret that signs sessions. An entry is
// `<owner id>=<password>`, and the owner types the password
// (docs/specs/platform/easier-to-use, "Short passwords"); an entry without
// `=` is the first form, `<secret>-<owner id>`, typed whole. A problem message
// never includes a passphrase, so it can go to the server log.
import { z } from 'zod';

export type PilotEntry = { ownerId: string; passphrase: string };
export type PilotConfig = { entries: PilotEntry[]; sessionSecret: string };
export type PilotConfigResult = { ok: true; config: PilotConfig } | { ok: false; problem: string };

const MIN_SECRET_PART = 12;
const MIN_SESSION_SECRET = 32;
const OWNER_ID = /^[a-z]+$/;

// An owner id as long as a password may be one, written first by mistake: a
// problem names its entry instead.
const named = (ownerId: string, entry: string) =>
  ownerId.length < MIN_SECRET_PART ? ownerId : entry;

const envSchema = z.object({
  PILOT_PASSPHRASES: z.string().optional(),
  SESSION_SECRET: z.string().optional(),
});

export function parsePilotConfig(env: {
  PILOT_PASSPHRASES?: string;
  SESSION_SECRET?: string;
}): PilotConfigResult {
  const { PILOT_PASSPHRASES = '', SESSION_SECRET = '' } = envSchema.parse(env);

  if (SESSION_SECRET.length < MIN_SESSION_SECRET) {
    return {
      ok: false,
      problem: `SESSION_SECRET must be at least ${MIN_SESSION_SECRET} characters`,
    };
  }

  const items = PILOT_PASSPHRASES.split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '');
  if (items.length === 0) {
    return { ok: false, problem: 'PILOT_PASSPHRASES has no entries' };
  }

  const entries: PilotEntry[] = [];
  for (const [index, item] of items.entries()) {
    const position = `PILOT_PASSPHRASES entry ${index + 1}`;
    const entry = item.includes('=') ? ownerFirst(item, position) : ownerLast(item, position);
    if (!entry.ok) return entry;
    const { ownerId, passphrase } = entry;
    if (entries.some((e) => e.ownerId === ownerId)) {
      return {
        ok: false,
        problem: `PILOT_PASSPHRASES has a duplicate owner id: ${named(ownerId, position)}`,
      };
    }
    const sharing = entries.findIndex((e) => e.passphrase === passphrase);
    if (sharing !== -1) {
      const earlier = named(entries[sharing].ownerId, `entry ${sharing + 1}`);
      return {
        ok: false,
        problem: `PILOT_PASSPHRASES: ${earlier} and ${named(ownerId, `entry ${index + 1}`)} share a password`,
      };
    }
    entries.push({ ownerId, passphrase });
  }

  return { ok: true, config: { entries, sessionSecret: SESSION_SECRET } };
}

type EntryResult = ({ ok: true } & PilotEntry) | { ok: false; problem: string };

// `sen=abcd-efg-hijk`: the owner types only the password.
function ownerFirst(item: string, position: string): EntryResult {
  const equals = item.indexOf('=');
  const ownerId = item.slice(0, equals).trim();
  const passphrase = item.slice(equals + 1).trim();
  if (!OWNER_ID.test(ownerId)) {
    return { ok: false, problem: `${position} must start with an owner id of lowercase letters` };
  }
  if (passphrase.length < MIN_SECRET_PART) {
    return {
      ok: false,
      problem: `${position}${ownerId.length < MIN_SECRET_PART ? ` (${ownerId})` : ''}: the password must be at least ${MIN_SECRET_PART} characters`,
    };
  }
  return { ok: true, ownerId, passphrase };
}

// `lotus-river-moon-sen`: the first form, typed whole.
function ownerLast(passphrase: string, position: string): EntryResult {
  const hyphen = passphrase.lastIndexOf('-');
  const ownerId = hyphen === -1 ? '' : passphrase.slice(hyphen + 1);
  if (!OWNER_ID.test(ownerId)) {
    return {
      ok: false,
      problem: `${position} must end with a hyphen and an owner id of lowercase letters`,
    };
  }
  if (hyphen < MIN_SECRET_PART) {
    const id = named(ownerId, 'the owner id');
    return {
      ok: false,
      problem: `${position} (${id}): the part before -${id} must be at least ${MIN_SECRET_PART} characters`,
    };
  }
  return { ok: true, ownerId, passphrase };
}

// Compares every entry, without stopping at the first match, so the time
// taken doesn't tell which passphrase came close.
export function findOwner(entries: PilotEntry[], input: string): string | null {
  const candidate = input.trim();
  let owner: string | null = null;
  for (const entry of entries) {
    if (timingSafeEqual(entry.passphrase, candidate) && candidate !== '') owner = entry.ownerId;
  }
  return owner;
}

export function displayName(ownerId: string): string {
  return ownerId.charAt(0).toUpperCase() + ownerId.slice(1);
}

const encoder = new TextEncoder();

export function timingSafeEqual(a: string, b: string): boolean {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let i = 0; i < length; i++) {
    difference |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return difference === 0;
}

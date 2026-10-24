// The pilot gate's configuration: one passphrase per owner, all in
// PILOT_PASSPHRASES, and the secret that signs sessions. A problem message
// never includes a passphrase, so it can go to the server log.
import { z } from 'zod';

export type PilotEntry = { ownerId: string; passphrase: string };
export type PilotConfig = { entries: PilotEntry[]; sessionSecret: string };
export type PilotConfigResult = { ok: true; config: PilotConfig } | { ok: false; problem: string };

const MIN_SECRET_PART = 12;
const MIN_SESSION_SECRET = 32;
const OWNER_ID = /^[a-z]+$/;

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
  for (const [index, passphrase] of items.entries()) {
    const position = `PILOT_PASSPHRASES entry ${index + 1}`;
    const hyphen = passphrase.lastIndexOf('-');
    const ownerId = hyphen === -1 ? '' : passphrase.slice(hyphen + 1);
    if (!OWNER_ID.test(ownerId)) {
      return {
        ok: false,
        problem: `${position} must end with a hyphen and an owner id of lowercase letters`,
      };
    }
    if (hyphen < MIN_SECRET_PART) {
      return {
        ok: false,
        problem: `${position} (${ownerId}): the part before -${ownerId} must be at least ${MIN_SECRET_PART} characters`,
      };
    }
    if (entries.some((entry) => entry.ownerId === ownerId)) {
      return { ok: false, problem: `PILOT_PASSPHRASES has a duplicate owner id: ${ownerId}` };
    }
    entries.push({ ownerId, passphrase });
  }

  return { ok: true, config: { entries, sessionSecret: SESSION_SECRET } };
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

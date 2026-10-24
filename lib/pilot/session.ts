// The pilot session cookie: `<payload>.<signature>`, both base64url. The
// payload holds the owner id, the sign-in time and a fingerprint of that
// owner's passphrase, so changing one passphrase signs out only that owner.
// Web Crypto only, so it runs in proxy.ts as well as in Node.
import { z } from 'zod';
import type { PilotConfig } from './config';

export const SESSION_COOKIE = 'shopfront_session';
export const SESSION_MAX_AGE_SECONDS = 2_592_000;

const FINGERPRINT_BYTES = 16;
const payloadSchema = z.object({ o: z.string(), t: z.number().int(), f: z.string() });
const encoder = new TextEncoder();

export async function createSession(
  ownerId: string,
  config: PilotConfig,
  now: Date,
): Promise<string> {
  const entry = config.entries.find((e) => e.ownerId === ownerId);
  if (!entry) throw new Error(`no passphrase for owner ${ownerId}`);
  const key = await signingKey(config.sessionSecret);
  const payload = toBase64Url(
    encoder.encode(
      JSON.stringify({
        o: ownerId,
        t: Math.floor(now.getTime() / 1000),
        f: await fingerprint(key, entry.passphrase),
      }),
    ),
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function readSession(
  value: string | undefined,
  config: PilotConfig,
  now: Date,
): Promise<{ ownerId: string } | null> {
  try {
    const [payload, signature, ...rest] = (value ?? '').split('.');
    if (!payload || !signature || rest.length > 0) return null;

    const key = await signingKey(config.sessionSecret);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      fromBase64Url(signature),
      encoder.encode(payload),
    );
    if (!valid) return null;

    const parsed = payloadSchema.safeParse(
      JSON.parse(new TextDecoder().decode(fromBase64Url(payload))),
    );
    if (!parsed.success) return null;
    const { o: ownerId, t: issuedAt, f } = parsed.data;

    const age = Math.floor(now.getTime() / 1000) - issuedAt;
    if (age < 0 || age > SESSION_MAX_AGE_SECONDS) return null;

    const entry = config.entries.find((e) => e.ownerId === ownerId);
    if (!entry || (await fingerprint(key, entry.passphrase)) !== f) return null;

    return { ownerId };
  } catch {
    return null;
  }
}

function signingKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function fingerprint(key: CryptoKey, passphrase: string): Promise<string> {
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(`fp:${passphrase}`));
  return toBase64Url(new Uint8Array(mac).slice(0, FINGERPRINT_BYTES));
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) throw new Error('not base64url');
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

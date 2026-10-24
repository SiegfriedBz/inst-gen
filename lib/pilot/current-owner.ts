import { cookies } from 'next/headers';
import { getPilotConfig } from './runtime-config';
import { readSession, SESSION_COOKIE } from './session';

// The signed-in owner for this request, or null. proxy.ts has already
// turned away requests without a session; this reads who it is.
export async function getCurrentOwner(): Promise<string | null> {
  const config = getPilotConfig();
  if (!config.ok) return null;
  const session = await readSession(
    (await cookies()).get(SESSION_COOKIE)?.value,
    config.config,
    new Date(),
  );
  return session?.ownerId ?? null;
}

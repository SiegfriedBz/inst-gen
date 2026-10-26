import { usageConfigProblem } from '@/lib/usage/config';
import { type PilotConfigResult, parsePilotConfig } from './config';

let cached: PilotConfigResult | undefined;

// Read once per server process. A problem is logged once; it never contains
// a passphrase.
export function getPilotConfig(): PilotConfigResult {
  if (!cached) {
    cached = parsePilotConfig({
      PILOT_PASSPHRASES: process.env.PILOT_PASSPHRASES,
      SESSION_SECRET: process.env.SESSION_SECRET,
    });
    const usageProblem = cached.ok ? usageConfigProblem(process.env) : null;
    if (usageProblem) cached = { ok: false, problem: usageProblem };
    if (!cached.ok) console.error(`Shopfront isn't configured: ${cached.problem}`);
  }
  return cached;
}

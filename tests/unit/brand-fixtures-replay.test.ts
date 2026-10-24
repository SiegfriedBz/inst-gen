import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { replayTextModel } from '@/lib/ai/replay';
import { FIXTURES_DIR, fixtureTransport, loadFixture } from '@/lib/brand/fixtures';
import { type Profile, profileSchema } from '@/lib/brand/profile';
import { prepareRead, streamProfile } from '@/lib/brand/read';

// Replays each fixture's recorded model answer through the real reader,
// offline: the saved pages, the code's checks, the final profile.

const slugs = readdirSync(FIXTURES_DIR).filter((slug) => !slug.startsWith('_'));

async function replay(slug: string): Promise<{ profile: Profile; pages: Map<string, string> }> {
  const dir = join(FIXTURES_DIR, slug);
  const fixture = loadFixture(dir);
  if (!fixture.recording) throw new Error(`${slug} has no recording.json`);
  const deps = { transport: fixtureTransport(dir), model: replayTextModel(fixture.recording) };
  const signal = new AbortController().signal;
  const prepared = await prepareRead(fixture.manifest.siteUrl, deps, signal);
  for await (const line of streamProfile(prepared, deps, signal)) {
    if (line.type === 'error') throw new Error(`${slug}: ${line.code}`);
    if (line.type === 'final') return { profile: line.profile, pages: prepared.pages };
  }
  throw new Error(`${slug}: no final line`);
}

describe('recorded brand reads', () => {
  test.each(slugs)('%s replays to a profile that passes the schema', async (slug) => {
    const { profile } = await replay(slug);
    expect(profileSchema.safeParse(profile).success).toBe(true);
    for (const source of [profile.name.source, ...profile.offerings.map((o) => o.source)]) {
      expect(profile.pagesRead).toContain(source);
    }
  });

  test.each([
    ['svarga', /svarga/i, 'Canggu', '6285607052972'],
    ['sen', /sen/i, 'Da Nang', '84898661224'],
  ])('%s: name, town and WhatsApp from its pages', async (slug, name, town, whatsapp) => {
    const { profile, pages } = await replay(slug);
    expect(profile.name.value).toMatch(name);
    expect(profile.location.town?.value).toBe(town);
    const wa = profile.contact.whatsapp;
    expect(wa?.value).toBe(`+${whatsapp}`);
    expect(profile.pagesRead).toContain(wa?.source);
    expect(profile.thin).toBe(false);
    expect(pages.size).toBeGreaterThan(0);
  });
});

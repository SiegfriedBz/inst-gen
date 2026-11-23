import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FIXTURES_DIR, fixtureProfile } from '@/lib/brand/fixtures';
import { comesToGuests } from '@/lib/posts/reasons';
import { senProfile, svargaProfile } from './helpers/brand';

// Reasons to book (docs/specs/posts/reasons-to-book).

describe('comesToGuests', () => {
  it('a spa with a service area comes to its guests', () => {
    expect(comesToGuests(svargaProfile())).toBe(true);
  });

  it('a spa with no service area does not', () => {
    // The helper's Sen has none.
    expect(comesToGuests(senProfile())).toBe(false);
  });

  it('a business that is no spa does not, service area or not', () => {
    expect(comesToGuests({ ...svargaProfile(), category: 'bakery' })).toBe(false);
  });

  it("Sen's and Svarga's saved reads do", async () => {
    for (const slug of ['sen', 'svarga']) {
      expect(comesToGuests(await fixtureProfile(join(FIXTURES_DIR, slug)))).toBe(true);
    }
  });
});

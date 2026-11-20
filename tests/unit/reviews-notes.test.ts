import { describe, expect, it } from 'vitest';
import { copyNotes, INVITE_PHRASES, invitesIn } from '@/lib/reviews/notes';

// What the evals print under a reply or an answer, and what the replay tests
// check (docs/specs/reviews/better-replies-and-answers, "The posts' rules on words").

describe('invitesIn', () => {
  it('finds the English phrases that invite a guest to the business, in order', () => {
    expect(invitesIn('We hope to see you again at Sen and to welcome you back soon')).toEqual([
      '"see you again at"',
      '"welcome you back"',
    ]);
    expect(invitesIn('We would love to have you back with us')).toEqual([
      '"have you back"',
      '"back with us"',
    ]);
  });

  it('finds none when the business comes to the guest', () => {
    expect(invitesIn('We would be glad to come to you again on your next visit to Bali')).toEqual(
      [],
    );
    expect(INVITE_PHRASES).toContain('come back');
  });

  it('matches whole words, any case', () => {
    expect(invitesIn('Come Back soon!')).toEqual(['"come back"']);
    expect(invitesIn('a comeback story')).toEqual([]);
  });
});

describe('copyNotes', () => {
  it('lists the clichés and the em dash, then the invitations for a business that goes to its guests', () => {
    expect(copyNotes('We would love to pamper you — come back soon!', true)).toEqual([
      '"pamper"',
      '"—"',
      '"come back"',
    ]);
    expect(copyNotes('We would love to pamper you — come back soon!', false)).toEqual([
      '"pamper"',
      '"—"',
    ]);
  });
});

import { describe, expect, test } from 'vitest';
import type { PlanResult, Post, PostBatch } from '@/lib/posts/batch';
import {
  applyEdit,
  autoRewrite,
  charsOver,
  flagsFor,
  INSTAGRAM_CAPTION_MAX,
  isPostStale,
  markNewImage,
  mergeRewrite,
  newestBatch,
  parseHashtags,
  postHash,
  postText,
  staleUnedited,
  storyFlagsFor,
} from '@/lib/posts/edit';
import { profileHash } from '@/lib/posts/input';
import type { Offer } from '@/lib/posts/offer';
import { senProfile } from './helpers/brand';
import { post } from './helpers/posts';

const profile = senProfile();
const changed = {
  ...profile,
  summary: { value: 'Massage at your villa in Da Nang', source: profile.siteUrl },
};
const CTA = 'Book on WhatsApp: +84898661224';

function batch(posts: Post[], hash = profileHash(profile)): PostBatch {
  return {
    id: 'b1',
    ownerId: 'sen',
    createdAt: '2026-10-25T09:00:00.000Z',
    profileReadAt: '2026-10-24T09:00:00.000Z',
    profileHash: hash,
    promptVersion: 'posts-2',
    model: 'm',
    posts,
    dropped: [],
  };
}

const six = Array.from({ length: 6 }, (_, i) =>
  post({ id: `post-${i + 1}`, caption: `Caption ${i + 1}.`, unchecked: [] }),
);

describe('editing a post', () => {
  test('hashtags are cleaned on save', () => {
    expect(parseHashtags('#DaNang massage, danang #spa')).toEqual(['danang', 'massage', 'spa']);
    expect(parseHashtags('#ĐàNẵng, #spa')).toEqual(['đànẵng', 'spa']);
  });

  test("an edited caption isn't cut", () => {
    const caption = `${'Warm oil and slow hands. '.repeat(36)}`.trim();
    expect(caption.length).toBeGreaterThan(700);
    const edited = applyEdit(six[0], { caption, hashtags: 'spa', altText: 'Hands' }, profile);
    expect(edited.caption).toBe(caption);
  });

  test('a price the owner adds is flagged', () => {
    const edited = applyEdit(
      six[0],
      { caption: 'A slow massage, only 450k tonight.', hashtags: '', altText: 'Hands' },
      profile,
    );
    expect(edited.unchecked).toEqual([{ kind: 'price', text: '450k' }]);
  });

  test('an edit stamps the profile it was read against', () => {
    const edited = applyEdit(
      { ...six[0], altToCheck: true },
      { caption: ' New words. ', hashtags: 'spa', altText: ' Hands on a back ' },
      profile,
    );
    expect(edited).toMatchObject({
      caption: 'New words.',
      hashtags: ['spa'],
      altText: 'Hands on a back',
      edited: true,
      altToCheck: false,
      profileHash: profileHash(profile),
    });
  });

  test('postText holds the caption, the call to action and the hashtags', () => {
    expect(postText({ caption: 'Warm oil.', hashtags: ['spa', 'danang'] }, CTA)).toBe(
      `Warm oil.\n\n${CTA}\n\n#spa #danang`,
    );
  });

  test('postText leaves out what is empty', () => {
    expect(postText({ caption: 'Warm oil.', hashtags: [] }, '')).toBe('Warm oil.');
    expect(postText({ caption: 'Warm oil.', hashtags: ['spa'] }, '')).toBe('Warm oil.\n\n#spa');
  });

  test('charsOver counts the whole post against Instagram', () => {
    const rest = postText({ caption: 'x', hashtags: ['spa'] }, CTA).length - 1;
    const caption = 'a'.repeat(INSTAGRAM_CAPTION_MAX - rest + 3);
    expect(charsOver({ caption, hashtags: 'spa', altText: '' }, CTA)).toBe(3);
    expect(charsOver({ caption: 'short', hashtags: 'spa', altText: '' }, CTA)).toBe(0);
  });
});

describe('staleness per post', () => {
  test("old posts take the batch's hash", () => {
    const b = batch(six, 'old');
    expect(postHash(six[0], b)).toBe('old');
    expect(postHash({ ...six[0], profileHash: 'mine' }, b)).toBe('mine');
  });

  test('only unedited out-of-date posts need the update', () => {
    const posts = six.map((p, i) => (i < 2 ? applyEdit(p, edit(p), profile) : p));
    const b = batch(posts);
    expect(staleUnedited(b, profile)).toEqual([]);
    expect(staleUnedited(b, changed).map((p) => p.id)).toEqual([
      'post-3',
      'post-4',
      'post-5',
      'post-6',
    ]);
    expect(isPostStale(posts[0], b, changed)).toBe(true);
    expect(isPostStale(posts[0], b, profile)).toBe(false);
  });

  test("an edited post's flags follow today's details", () => {
    const flagged = { ...six[0], caption: 'Only 450k.', edited: true, unchecked: [] };
    const b = batch([flagged], 'old');
    expect(flagsFor(flagged, b, profile)).toEqual([{ kind: 'price', text: '450k' }]);
    const fresh = { ...flagged, profileHash: profileHash(profile) };
    expect(flagsFor(fresh, batch([fresh], 'old'), profile)).toEqual([]);
  });
});

describe('the automatic update after a business edit', () => {
  const older = (posts: Post[], hash?: string): PostBatch => ({
    ...batch(posts, hash),
    id: 'b0',
    createdAt: '2026-10-24T09:00:00.000Z',
  });

  test('newestBatch goes by createdAt, not by the list order', () => {
    expect(newestBatch([older(six), batch(six)])?.id).toBe('b1');
    expect(newestBatch([])).toBeUndefined();
  });

  test('autoRewrite picks the newest batch by createdAt', () => {
    const next = autoRewrite([older(six), batch(six)], changed);
    expect(next?.batch.id).toBe('b1');
    expect(next?.postIds).toEqual(six.map((p) => p.id));
  });

  test('autoRewrite leaves edited posts out', () => {
    const posts = six.map((p, i) => (i < 2 ? { ...p, edited: true } : p));
    expect(autoRewrite([batch(posts)], changed)?.postIds).toEqual([
      'post-3',
      'post-4',
      'post-5',
      'post-6',
    ]);
  });

  test('autoRewrite is null when only an older batch is out of date', () => {
    expect(autoRewrite([older(six, 'stale000'), batch(six)], profile)).toBeNull();
  });

  test('autoRewrite is null when every out-of-date post is edited', () => {
    const posts = six.map((p) => ({ ...p, edited: true }));
    expect(autoRewrite([batch(posts)], changed)).toBeNull();
  });

  test('autoRewrite is null when only the WhatsApp number changed', () => {
    const whatsapp = {
      ...profile,
      contact: {
        ...profile.contact,
        whatsapp: { value: '+84900000000', source: 'owner' as const },
      },
    };
    expect(autoRewrite([batch(six)], whatsapp)).toBeNull();
  });

  test("flags on an older batch's unedited out-of-date post follow the current profile", () => {
    const flagged = { ...six[0], caption: 'Only 990k.', unchecked: [] };
    const old = batch([flagged]);
    expect(flagsFor(flagged, old, changed, false)).toEqual([
      expect.objectContaining({ kind: 'price' }),
    ]);
    expect(flagsFor(flagged, old, changed, true)).toEqual([]);
    expect(flagsFor(flagged, old, changed)).toEqual([]);
  });
});

describe('the rewrite merge', () => {
  test("the merge keeps what wasn't sent", () => {
    const posts = six.map((p, i) => (i < 2 ? { ...p, edited: true } : p));
    const b = batch(posts, 'old');
    const sent = ['post-3', 'post-4', 'post-5', 'post-6'];
    const result: PlanResult = {
      posts: posts.slice(2).map((p) => ({ ...p, caption: `New ${p.id}.` })),
      dropped: [],
      promptVersion: 'posts-3',
      model: 'm2',
      profileHash: 'new',
    };
    const merged = mergeRewrite(b, result, sent);
    expect(merged.posts.map((p) => p.caption)).toEqual([
      'Caption 1.',
      'Caption 2.',
      'New post-3.',
      'New post-4.',
      'New post-5.',
      'New post-6.',
    ]);
    expect(merged).toMatchObject({ profileHash: 'new', promptVersion: 'posts-3', model: 'm2' });
    expect(merged.posts[0]).toMatchObject({ edited: true, profileHash: 'old' });
    expect(merged.posts[2]).toMatchObject({ edited: false, profileHash: 'new' });
  });

  test('a new image asks for the description to be checked', () => {
    const marked = markNewImage(batch(six), 'post-2');
    expect(marked.posts[1].altToCheck).toBe(true);
    expect(marked.posts[0].altToCheck).toBeUndefined();
  });
});

function edit(p: Post) {
  return { caption: p.caption, hashtags: p.hashtags.join(' '), altText: p.altText };
}

describe('what clears saved and copied', () => {
  const NOW = '2026-10-27T10:00:00.000Z';

  test('an edit clears copied, keeps saved', () => {
    const p = applyEdit(
      post({ savedAt: NOW, copiedAt: NOW }),
      { caption: 'New words.', hashtags: '#danang', altText: '' },
      profile,
    );
    expect(p.copiedAt).toBeUndefined();
    expect(p.savedAt).toBe(NOW);
  });

  test('a rewritten post loses copied, keeps saved; one not sent keeps both', () => {
    const b = batch([
      post({ id: 'p1', savedAt: NOW, copiedAt: NOW }),
      post({ id: 'p2', savedAt: NOW, copiedAt: NOW }),
    ]);
    const result: PlanResult = {
      posts: [post({ id: 'p1', caption: 'Rewritten.' })],
      dropped: [],
      promptVersion: 'posts-1',
      model: 'm',
      profileHash: profileHash(changed),
    };
    const merged = mergeRewrite(b, result, ['p1']);
    expect(merged.posts[0]).toMatchObject({ caption: 'Rewritten.', savedAt: NOW });
    expect(merged.posts[0].copiedAt).toBeUndefined();
    expect(merged.posts[1]).toMatchObject({ savedAt: NOW, copiedAt: NOW });
  });

  test('a new image clears saved, keeps copied', () => {
    const marked = markNewImage(batch([post({ id: 'p1', savedAt: NOW, copiedAt: NOW })]), 'p1');
    expect(marked.posts[0].savedAt).toBeUndefined();
    expect(marked.posts[0].copiedAt).toBe(NOW);
  });
});

describe('edits and the special offer', () => {
  const offer: Offer = {
    kind: 'discount',
    percent: 10,
    treatments: ['Vietnamese Traditional Massage'],
    until: '2026-10-27',
    lastDay: 'Tuesday 27 October',
  };
  const kinds = (p: Post) => p.unchecked.filter((f) => f.kind === 'offer').map((f) => f.text);

  test("an edit of an offer post is checked against the batch's offer", () => {
    const edited = applyEdit(
      post({ offer: true }),
      { caption: '15% off, until 27 Oct.', hashtags: '', altText: 'x' },
      profile,
      offer,
    );
    expect(kinds(edited)).toEqual(['15%']);
    expect(edited.offer).toBe(true);
  });

  test("an out-of-date post's flags use the batch's offer", () => {
    const stale = post({ edited: true, offer: true, caption: '20% off, until 27 Oct.' });
    const flags = flagsFor(stale, { ...batch([stale], 'old'), offer }, profile);
    expect(flags.filter((f) => f.kind === 'offer').map((f) => f.text)).toEqual(['20%']);
  });
});

// The story text's flags and the owner's edits (docs/specs/posts/story-text).
describe('the story text', () => {
  test("an edited post's story flags follow today's details", () => {
    const flagged = { ...six[0], storyText: 'Only 450k. 🌸', storyUnchecked: [], edited: true };
    const b = batch([flagged], 'old');
    expect(storyFlagsFor(flagged, b, profile)).toEqual([{ kind: 'price', text: '450k' }]);
    const fresh = { ...flagged, profileHash: profileHash(profile) };
    expect(storyFlagsFor(fresh, batch([fresh], 'old'), profile)).toEqual([]);
  });

  test('a post without a story text has no story flags', () => {
    expect(storyFlagsFor(six[0], batch([six[0]], 'old'), profile, false)).toEqual([]);
  });

  test('editing the caption keeps the story text and its flags', () => {
    const before = {
      ...six[0],
      storyText: 'Calm tonight. 🌸',
      storyUnchecked: [{ kind: 'price' as const, text: '450k' }],
    };
    const edited = applyEdit(
      before,
      { caption: 'New words.', hashtags: 'spa', altText: 'x' },
      profile,
    );
    expect(edited.storyText).toBe('Calm tonight. 🌸');
    expect(edited.storyUnchecked).toEqual([{ kind: 'price', text: '450k' }]);
  });
});

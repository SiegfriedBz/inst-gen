import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterAll, beforeEach, describe, expect, test } from 'vitest';
import { forgetBrand, resetStoreForTests } from '@/lib/brand/store';
import { clearReview, loadReview, type ReviewRecord, saveReview } from '@/lib/reviews/store';

// Only the current review, kept until a new one or 3am
// (docs/specs/reviews/reply-drafts, "Kept until a new review or 3am"). The
// phone in Da Nang: local times below are the phone's clock.
const zone = process.env.TZ;
process.env.TZ = 'Asia/Ho_Chi_Minh';
afterAll(() => {
  if (zone === undefined) delete process.env.TZ;
  else process.env.TZ = zone;
});

const local = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m);

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetStoreForTests();
});

function record(over: Partial<ReviewRecord> = {}): ReviewRecord {
  return {
    ownerId: 'sen',
    name: 'Anna K.',
    review: 'Lovely hot stone massage.',
    locale: 'vi',
    answer: {
      reviewLanguage: 'en',
      abusive: false,
      reviewTranslation: 'Massage đá nóng tuyệt vời.',
      short: { text: 'Thank you, {name}! 🪷', translation: 'Cảm ơn {name}! 🪷' },
      warm: { text: 'Dear {name}, thank you. 🙏', translation: 'Thân mến {name}.' },
      model: 'gemini-3.5-flash-lite',
      promptVersion: 'reply-1',
    },
    edits: { short: null, warm: null },
    createdAt: local(26, 22).toISOString(),
    ...over,
  };
}

describe('the current review', () => {
  test('is kept, and only for its owner', async () => {
    await saveReview(record());
    expect(await loadReview('sen', local(26, 23))).toEqual(record());
    expect(await loadReview('svarga', local(26, 23))).toBeNull();
  });

  test('a new one replaces it', async () => {
    await saveReview(record());
    await saveReview(record({ review: 'Second review.' }));
    expect((await loadReview('sen', local(26, 23)))?.review).toBe('Second review.');
  });

  test('"Paste a new review" clears it', async () => {
    await saveReview(record());
    await clearReview('sen');
    expect(await loadReview('sen', local(26, 23))).toBeNull();
  });

  test('stays until 3am, then is gone for good', async () => {
    await saveReview(record());
    expect(await loadReview('sen', local(27, 2, 59))).not.toBeNull();
    expect(await loadReview('sen', local(27, 3))).toBeNull();
    // Deleted, not just hidden.
    expect(await loadReview('sen', local(26, 23))).toBeNull();
  });

  test('a record that no longer fits is dropped', async () => {
    await saveReview({ ...record(), answer: { broken: true } } as unknown as ReviewRecord);
    expect(await loadReview('sen', local(26, 23))).toBeNull();
  });

  test('forgetting the business forgets its review too', async () => {
    await saveReview(record());
    await saveReview(record({ ownerId: 'svarga' }));
    await forgetBrand('sen');
    expect(await loadReview('sen', local(26, 23))).toBeNull();
    expect(await loadReview('svarga', local(26, 23))).not.toBeNull();
  });

  test('without IndexedDB load is null and save is a no-op', async () => {
    // @ts-expect-error: a browser without IndexedDB
    globalThis.indexedDB = undefined;
    resetStoreForTests();
    await expect(saveReview(record())).resolves.toBeUndefined();
    await expect(clearReview('sen')).resolves.toBeUndefined();
    expect(await loadReview('sen', local(26, 23))).toBeNull();
  });
});

import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterAll, beforeEach, expect, test } from 'vitest';
import { resetStoreForTests } from '@/lib/brand/store';
import { DEFAULT_ANSWERS } from '@/lib/posts/offer';
import { clearOffer, loadOffer, type OfferRecord, saveOffer } from '@/lib/posts/offer-store';
import { svargaProfile } from './helpers/brand';

// Today's offer, kept until Google's reset, 14:00 in Da Nang in US summer
// time (docs/specs/posts/special-offer, "How long it lasts"). Local times
// below are the phone's clock in Da Nang.
const zone = process.env.TZ;
process.env.TZ = 'Asia/Ho_Chi_Minh';
afterAll(() => {
  if (zone === undefined) delete process.env.TZ;
  else process.env.TZ = zone;
});

const local = (d: number, h: number) => new Date(2026, 9, d, h);

function profile(names = ['Thai Massage', 'Foot Reflexology']) {
  const p = svargaProfile();
  p.offerings = names.map((name) => ({ name, source: p.siteUrl }));
  return p;
}

function record(over: Partial<OfferRecord> = {}): OfferRecord {
  return {
    ownerId: 'sen',
    answers: { ...DEFAULT_ANSWERS, treatments: ['Thai Massage', 'Foot Reflexology'] },
    offer: {
      kind: 'discount',
      percent: 10,
      treatments: ['Thai Massage', 'Foot Reflexology'],
      until: '2026-10-25',
      lastDay: 'Sunday 25 October',
    },
    createdAt: local(25, 15).toISOString(),
    ...over,
  };
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetStoreForTests();
});

test('saved today, loaded as saved', async () => {
  await saveOffer(record());
  expect(await loadOffer('sen', profile(), local(26, 10))).toEqual(record());
});

test('saved before the reset, gone', async () => {
  await saveOffer(record({ createdAt: local(25, 13).toISOString() }));
  expect(await loadOffer('sen', profile(), local(25, 15))).toBeNull();
  expect(await loadOffer('sen', profile(), local(25, 13))).toBeNull();
});

test('a treatment that left the business leaves the offer and its answers', async () => {
  await saveOffer(record());
  const loaded = await loadOffer('sen', profile(['Thai Massage']), local(25, 16));
  expect(loaded?.offer.treatments).toEqual(['Thai Massage']);
  expect(loaded?.answers.treatments).toEqual(['Thai Massage']);
  expect(await loadOffer('sen', profile(['Hot Stone']), local(25, 16))).toBeNull();
  expect(await loadOffer('sen', profile(), local(25, 16))).toBeNull();
});

test('clearOffer removes it', async () => {
  await saveOffer(record());
  await clearOffer('sen');
  expect(await loadOffer('sen', profile(), local(25, 16))).toBeNull();
});

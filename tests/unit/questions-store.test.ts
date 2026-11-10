import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterAll, beforeEach, describe, expect, test } from 'vitest';
import { forgetBrand, resetStoreForTests } from '@/lib/brand/store';
import {
  type ConversationRecord,
  clearConversation,
  loadConversation,
  saveConversation,
} from '@/lib/questions/store';

// The current conversation, kept on the phone until a new one or Google's reset
// (docs/specs/questions/answer-drafts, "Kept until a new conversation or the
// daily reset"). The phone in Da Nang.
const zone = process.env.TZ;
process.env.TZ = 'Asia/Ho_Chi_Minh';
afterAll(() => {
  if (zone === undefined) delete process.env.TZ;
  else process.env.TZ = zone;
});

const local = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetStoreForTests();
});

function record(over: Partial<ConversationRecord> = {}): ConversationRecord {
  return {
    ownerId: 'sen',
    known: { place: 'Hyatt', day: 'tomorrow', time: null },
    current: {
      question: 'How much is a Thai massage?',
      final: false,
      locale: 'vi',
      answer: {
        questionLanguage: 'en',
        sexual: false,
        unanswered: false,
        questionTranslation: 'Giá?',
        answer: { text: 'Hello!\n\nThai Massage, 60 min.', translation: null },
        guest: { place: 'Hyatt', day: 'tomorrow', time: null },
        flags: [],
        model: 'gemini-3.5-flash-lite',
        promptVersion: 'answer-1',
      },
      edit: null,
      createdAt: local(10, 10).toISOString(),
    },
    updatedAt: local(10, 10).toISOString(),
    ...over,
  };
}

describe('the conversation', () => {
  test('is kept across a reload, and only for its owner', async () => {
    await saveConversation(record());
    expect(await loadConversation('sen', local(10, 11))).toEqual(record());
    expect(await loadConversation('svarga', local(10, 11))).toBeNull();
  });

  test('the next message keeps what the guest told', async () => {
    await saveConversation(record({ current: null }));
    expect((await loadConversation('sen', local(10, 11)))?.known.place).toBe('Hyatt');
  });

  test('a new conversation clears it all', async () => {
    await saveConversation(record());
    await clearConversation('sen');
    expect(await loadConversation('sen', local(10, 11))).toBeNull();
  });

  test('goes when the owner forgets their business', async () => {
    await saveConversation(record());
    await forgetBrand('sen');
    expect(await loadConversation('sen', local(10, 11))).toBeNull();
  });

  test("goes at Google's reset, 15:00 in Da Nang in November", async () => {
    await saveConversation(record());
    expect(await loadConversation('sen', local(10, 14, 59))).not.toBeNull();
    expect(await loadConversation('sen', local(10, 15, 1))).toBeNull();
    expect(await loadConversation('sen', local(10, 16))).toBeNull();
  });
});

import { openStore } from '@/lib/brand/store';
import { hashText } from './input';
import type { TranslateLocale } from './translate';

// A caption's translation kept on the phone (docs/specs/posts/editor-download,
// "The owner's-language view"), used only while its caption is unchanged, so
// reopening the view costs nothing. Without IndexedDB nothing is kept.

export type SavedTranslation = {
  batchId: string;
  postId: string;
  ownerId: string;
  locale: TranslateLocale;
  captionHash: string;
  text: string;
  // The story text's, asked with the caption (docs/specs/posts/story-text).
  storyHash?: string;
  story?: string;
  model: string;
  promptVersion: string;
  createdAt: string;
};

export async function loadTranslation(
  batchId: string,
  postId: string,
  locale: TranslateLocale,
  caption: string,
  story?: string,
): Promise<SavedTranslation | null> {
  const db = await openStore();
  if (!db) return null;
  const saved = await db.get('translations', [batchId, postId, locale]);
  if (!saved || saved.captionHash !== hashText(caption)) return null;
  // One kept before story texts, or for another story text, isn't enough.
  if (story && (saved.storyHash !== hashText(story) || !saved.story)) return null;
  return saved;
}

export async function saveTranslation(translation: SavedTranslation): Promise<void> {
  const db = await openStore();
  await db?.put('translations', translation);
}

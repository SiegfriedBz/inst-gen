import type { TranslateLocale } from './translate';

// What Flash-Lite reads to translate a caption for the owner to understand
// (docs/specs/posts/editor-download, "The owner's-language view"). Bump the
// version with every change.

export const TRANSLATE_PROMPT_VERSION = 'translate-1';

const LANGUAGES: Record<TranslateLocale, string> = {
  id: 'Indonesian',
  vi: 'Vietnamese',
};

export function translatePrompt(locale: TranslateLocale): string {
  return [
    `Translate the Instagram caption you are given into ${LANGUAGES[locale]}.`,
    'The business owner reads it to understand what the English caption says; it is never posted.',
    'Translate faithfully and plainly. Keep prices, numbers, names and emoji exactly as they are.',
    'Add nothing, leave nothing out, and give no notes or explanations.',
    'Answer with the translation only, as plain text.',
  ].join('\n');
}

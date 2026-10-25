import type { ReplyBody, ScreenLocale } from './reply';

// What Flash-Lite reads to write two replies to a review
// (docs/specs/reviews/reply-drafts, "The replies"). Bump the version with
// every change.

export const REPLY_PROMPT_VERSION = 'reply-1';

const LANGUAGES: Record<ScreenLocale, string> = {
  en: 'English',
  id: 'Indonesian',
  vi: 'Vietnamese',
};

export function replyPrompt(body: ReplyBody, flower: string): { system: string; text: string } {
  const owner = LANGUAGES[body.locale];
  const name = body.hasName
    ? 'Greet the guest with the placeholder {name}, written exactly so, once in each reply and each translation; code puts the name there. Put the honorific the language uses around it when one fits ("chị {name}", "{name}님").'
    : 'The guest gave no name. Do not write {name} or any name; greet them without one.';
  const system = [
    'You write replies from a small business to a Google Maps review, for the owner to paste under it.',
    'Write two replies, in the same language as the review (its main language if it mixes several):',
    '- "short": plainer and shorter;',
    '- "warm": warmer and more personal.',
    'Each reply is 2 to 4 sentences. It thanks the guest and names one thing they liked.',
    'If the review complains, own it in one short sentence, plainly, with no excuse.',
    'Invite them back, warmly and briefly.',
    'Promise nothing the owner has not decided: no fix, no change, no discount, no free visit.',
    'Never argue, never blame the guest, never write "as we told you". No phone number, link or email.',
    `Emoji: at most 2 emoji in a reply: the flower ${flower}, usually at the end, and 🙏 next to the thanks. No 😊 when the review complains.`,
    'If the review is abusive or fake (insults, threats, a visit that cannot have happened), set "abusive" to true and keep both replies short, polite and neutral, with no emoji.',
    name,
    `The owner reads ${owner}. Give "reviewLanguage" as a BCP 47 code ("en", "ru", "vi").`,
    `Translate the review and each reply into ${owner} for the owner to read, faithfully and plainly, keeping names, numbers and emoji ("reviewTranslation" and each "translation").`,
    `If the review is already in ${owner}, set "reviewTranslation" and both "translation" fields to null.`,
  ].join('\n');
  const lines = [
    `Business: ${body.business.name}`,
    ...(body.business.summary ? [`About it: ${body.business.summary}`] : []),
    '',
    'Review:',
    body.review,
  ];
  if (body.avoid) {
    lines.push(
      '',
      'The owner did not use these two replies. Say it differently:',
      `short: ${body.avoid[0]}`,
      `warm: ${body.avoid[1]}`,
    );
  }
  return { system, text: lines.join('\n') };
}

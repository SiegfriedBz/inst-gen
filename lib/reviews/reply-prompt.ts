import { TONE_RULE, WORD_RULES } from './copy-rules';
import type { ReplyBody, ScreenLocale } from './reply';

// What Flash-Lite reads to write two replies to a review
// (docs/specs/reviews/reply-drafts, "The replies", changed by
// docs/specs/reviews/better-replies-and-answers): the thanks for a massage, the
// treatments by their own names, an invitation that follows where the massage
// happens, the posts' rules on words, and three emoji. No sentence to copy
// (docs/specs/posts/day-and-night-copy), but where {name} goes. Bump the
// version with every change.

export const REPLY_PROMPT_VERSION = 'reply-5';

const LANGUAGES: Record<ScreenLocale, string> = {
  en: 'English',
  id: 'Indonesian',
  vi: 'Vietnamese',
};

// Code says where the massage happens ("A business that goes to its guests").
function invitation(body: ReplyBody): string {
  return body.business.goesToGuests
    ? "The business goes to its guests: its therapists come to the guest's hotel, villa or home, and the guest never comes to it. Never invite them to come, come back, return or visit, never say you hope to welcome or see them again at your place, and never speak of a place of the business (its rooms, building, facilities, atmosphere or parking) as where they were, in any language. End each reply by saying, warmly and briefly, that you would be glad to come to them again, on their next stay or whenever they would like another massage."
    : `End each reply by inviting them to come back to ${body.business.name}, warmly and briefly.`;
}

export function replyPrompt(body: ReplyBody, flower: string): { system: string; text: string } {
  const owner = LANGUAGES[body.locale];
  const name = body.hasName
    ? 'Greet the guest with the placeholder {name}, written exactly so, once, in the first sentence of each reply and each translation; code puts the name there. Put the honorific the language uses around it when one fits ("chị {name}", "{name}님").'
    : 'The guest gave no name. Do not write {name} or any name; greet them without one.';
  const system = [
    'You write replies from a small massage and wellness business to a Google Maps review, for the owner to paste under it. Each reply thanks the guest for their massage.',
    TONE_RULE,
    'Write two replies, in the same language as the review (its main language if it mixes several):',
    '- "short": plainer and shorter;',
    '- "warm": warmer and more personal.',
    `Both replies are in the review's language, never in ${owner} unless the review is: only the translations are in ${owner}.`,
    'Each reply is 3 or 4 short sentences: the thanks; what the guest liked, the sorry for any complaint, or both; the invitation last. A review of a few words gets three short sentences in each reply: the thanks, that you are glad they enjoyed their massage, the invitation.',
    "Never repeat the guest's own words of praise for the massage (amazing, best, perfect): say you are glad they enjoyed it, in your own plain words.",
    'Say what the guest liked only in their own terms. Name a treatment only when the guest named one of the business\'s treatments (under "Treatments"), as written there; otherwise say "your massage" or the like, in your own plain words. Never take the guest\'s words for a treatment\'s name, and never add a detail the guest did not give.',
    'Answer every complaint, even a small one, in one short sentence, plainly, with no excuse: say sorry, not "we acknowledge". Set "complaint" to true when the review complains about anything, even a small thing; else false.',
    invitation(body),
    'Promise nothing the owner has not decided: no fix, no change, no discount, no free visit. No fact about the business that is not written here: no years open, rating or award.',
    'Never argue, never blame the guest, never write "as we told you". No phone number, link or email.',
    WORD_RULES,
    `Emoji: only 🙏, 😊 and ${flower}, one of each, where a sentence ends, never inside one. 🙏 right after the thank-you sentence. 😊 at the end of the sentence on what the guest liked, in place of its full stop, only when the review holds no complaint. ${flower} at the very end of the reply.`,
    "Every sentence ends on its full stop, question mark or exclamation mark, except where an emoji takes the full stop's place: then no full stop before or after the emoji.",
    'If the review is abusive or fake (insults, threats, a massage that cannot have happened), set "abusive" to true and keep both replies short, calm and neutral, with no emoji. Never say the review is false, never accuse the guest: say there is no record of the visit and invite them to contact the business directly.',
    name,
    `The owner reads ${owner}. Give "reviewLanguage" as a BCP 47 code ("en", "ru", "vi").`,
    `Translate the review and each reply into ${owner} for the owner to read, faithfully and plainly, keeping names, numbers and emoji ("reviewTranslation" and each "translation").`,
    `If the review is already in ${owner}, set "reviewTranslation" and both "translation" fields to null.`,
  ].join('\n');
  const offerings = body.business.offerings;
  const lines = [
    `Business: ${body.business.name}`,
    ...(body.business.summary ? [`About it: ${body.business.summary}`] : []),
    `Treatments: ${offerings.length > 0 ? offerings.join('; ') : 'none listed'}`,
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

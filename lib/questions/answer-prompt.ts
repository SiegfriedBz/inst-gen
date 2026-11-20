import { goesToGuests, TONE_RULE, WORD_RULES } from '@/lib/reviews/copy-rules';
import type { ScreenLocale } from '@/lib/reviews/reply';
import type { QuestionBody } from './question';

// What Flash-Lite reads to answer one guest's message
// (docs/specs/questions/answer-drafts, "The answer", changed by
// docs/specs/reviews/better-replies-and-answers). It writes each part on its
// own; code builds the answer from them (lib/questions/checks.ts). No example
// sentence to copy (docs/specs/posts/day-and-night-copy). Bump the version
// with every change.

export const ANSWER_PROMPT_VERSION = 'answer-3';

const LANGUAGES: Record<ScreenLocale, string> = {
  en: 'English',
  id: 'Indonesian',
  vi: 'Vietnamese',
};

function callToAction(final: boolean): string {
  return final
    ? '"callToAction": one sentence that asks the guest to book now, asking only for what the guest has not told yet under "What the guest has told": the day, the time, and where they are staying, for a business that goes to its guests ("Goes to its guests: yes"). When nothing is missing, ask them to confirm the booking with those details. No phone number and no link: the owner pastes the answer in the chat where the guest asked.'
    : // The gentle offer ("The gentle offer"), as decision 0009 reads the
      // libraries: one next step, easy to take, and no hard sell (IG
      // references/voice-rules.md at 550d3cf); make the first step easy, and
      // urgency only when it is real (CH marketing-psychology/SKILL.md at
      // 96798cf).
      '"callToAction": the gentle offer that ends the answer: one short sentence, in your own words, that makes booking feel easy and welcome, from the details; for a business that goes to its guests, that a therapist can come to the guest where they are staying, naming that place as the guest put it when they gave it. One next step, easy to take. It never presses: no "book now", no deadline, no urgency or scarcity, no discount. It asks for no day, time or place, and names no day or time: the details do not say what is free. A statement, or a short question the guest can answer yes to; never a question with no next step. When "sexual" is true, leave the callToAction\'s text empty and its translation null. No phone number and no link.';
}

// Only when the website is known ("The website, only when asked"): code puts
// the address in place of {website}, so it is never a page that doesn't exist.
const WEBSITE_RULE =
  'Never send the guest to the website, except when they ask to see photos, or want more about a treatment than its description says. Then one short sentence of "answer" says they will find it on the website: write {website}, exactly so, where the address goes, and never a web address of your own, not even one of the business\'s: code puts the address there.';

function sexRule(spa: boolean): string {
  return spa
    ? '"sexual": true when the message asks for sex, a sexual service or anything more than a professional massage, or mentions sex at all, in any language and with any euphemism. "professionalOnly": always one sentence, in the language of the message, saying the business offers only professional therapeutic massage. When "sexual" is true, the answer is calm, short and polite, with no emoji; it never repeats the guest\'s words, never jokes, and speaks only of the real treatments.'
    : '"sexual": true when the message asks for sex or mentions it, in any language. Then the answer is calm, short and polite, with no emoji, and speaks only of what the business offers. "professionalOnly": leave its text empty and its translation null.';
}

export function answerPrompt(
  body: QuestionBody,
  flower: string,
  spa: boolean,
): { system: string; text: string } {
  const owner = LANGUAGES[body.locale];
  const system = [
    'You answer a message a guest sent a small business, in a chat on WhatsApp or Instagram, for its owner to paste back.',
    ...(spa
      ? [
          'The business is a massage and wellness business: the answer helps the guest choose and book a massage, gently.',
        ]
      : []),
    TONE_RULE,
    'Write in the language of the message (its main language if it mixes several). Give "questionLanguage" as a BCP 47 code ("en", "ru", "vi").',
    'Use only the facts under "Business": its treatments with their durations and prices as written, its hours, its town, its area and where it goes with its travel terms, its highlights, and its contact details only when the guest asks how to reach it. Never invent a treatment, a price, a discount, a free time, a payment method or any other fact.',
    "Name a treatment only as the details write it: never take the guest's words for a treatment's name.",
    'For a business that goes to its guests ("Goes to its guests: yes"), never invite the guest to come, come back or visit, and never speak of a place of the business as where they would be: a therapist comes to where the guest is staying, as its details say.',
    'When the details do not answer part of the message (a card payment, a free slot tonight, parking), say the team will check and reply, and set "unanswered" to true.',
    'When you list treatments, give each with its duration and its price, as the details write them: one per line when there are more than two, its name, its duration, then its price.',
    '"greeting": a short greeting, with no name, ending on its punctuation.',
    `"answer": the answer to each thing the guest asked, in 1 to 4 short sentences, plain and warm, in the business's tone, with the list of treatments when you give one.`,
    callToAction(body.final),
    ...(body.business.website ? [WEBSITE_RULE] : []),
    `"guest": what the guest has told so far about their booking, from "What the guest has told" and this message: where they are staying, the day and the time, each as they put it, written in ${owner}, or null.`,
    sexRule(spa),
    WORD_RULES,
    `Emoji: only 😊 and ${flower}, one of each: 😊 at the end of a sentence, in place of its full stop (the greeting, or a sentence of the answer), and ${flower} at the very end of your last part. No emoji when "sexual" is true.`,
    "Every sentence ends on its full stop, question mark or exclamation mark, except where an emoji takes the full stop's place: then no full stop before or after the emoji.",
    'Never reuse a phrase from these instructions: write as the owner would.',
    'Promise nothing the owner has not decided: no discount, no free extra, no arrival time.',
    `Translate the message and each part into ${owner} for the owner to read, faithfully and plainly, keeping names, numbers and emoji ("questionTranslation" and each "translation"). If the message is already in ${owner}, set them all to null.`,
  ].join('\n');

  const b = body.business;
  const treatments = b.offerings.map((o) => {
    const facts = [o.name, o.duration, o.price].filter(Boolean).join(', ');
    return `- ${facts}${o.description ? `: ${o.description}` : ''}`;
  });
  const contact = [
    b.contact.whatsapp && `WhatsApp ${b.contact.whatsapp}`,
    b.contact.phone && `phone ${b.contact.phone}`,
    b.contact.email && `email ${b.contact.email}`,
    b.contact.instagram && `Instagram ${b.contact.instagram}`,
    b.contact.bookingUrl && `booking link ${b.contact.bookingUrl}`,
  ].filter(Boolean);
  const told = (value: string | null) => value ?? 'not yet';
  const lines = [
    `Business: ${b.name}`,
    ...(b.summary ? [`About it: ${b.summary}`] : []),
    `Kind: ${b.category}`,
    'Treatments:',
    ...(treatments.length > 0 ? treatments : ['- none listed']),
    `Highlights: ${b.highlights.length > 0 ? b.highlights.join('; ') : 'none listed'}`,
    `Hours: ${b.hours ?? 'not listed'}`,
    `Town: ${b.town ?? 'not listed'}${b.area ? `, ${b.area}` : ''}`,
    `Where it goes: ${b.serviceArea ?? 'not listed'}`,
    `Goes to its guests: ${goesToGuests(b.serviceArea) ? 'yes' : 'no'}`,
    `Contact: ${contact.length > 0 ? contact.join(', ') : 'not listed'}`,
    '',
    'What the guest has told:',
    `- Staying at: ${told(body.known.place)}`,
    `- Day: ${told(body.known.day)}`,
    `- Time: ${told(body.known.time)}`,
    '',
    `Final answer: ${body.final ? 'yes' : 'no'}`,
    '',
    'Message:',
    body.question,
  ];
  if (body.avoid) {
    lines.push('', 'The owner did not use this answer. Say it differently:', body.avoid);
  }
  return { system, text: lines.join('\n') };
}

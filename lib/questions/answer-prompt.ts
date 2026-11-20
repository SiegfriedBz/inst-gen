import { goesToGuests, TONE_RULE, WORD_RULES } from '@/lib/reviews/copy-rules';
import type { ScreenLocale } from '@/lib/reviews/reply';
import { guestScript, SCRIPT_NAMES } from '@/lib/reviews/script';
import type { QuestionBody } from './question';

// What Flash-Lite reads to answer one guest's message
// (docs/specs/questions/answer-drafts, "The answer", changed by
// docs/specs/reviews/better-replies-and-answers). It writes each part on its
// own; code builds the answer from them (lib/questions/checks.ts). No example
// sentence to copy (docs/specs/posts/day-and-night-copy). Bump the version
// with every change.

export const ANSWER_PROMPT_VERSION = 'answer-7';

const LANGUAGES: Record<ScreenLocale, string> = {
  en: 'English',
  id: 'Indonesian',
  vi: 'Vietnamese',
};

function callToAction(final: boolean): string {
  return final
    ? '"callToAction": one sentence that asks the guest to book now, asking only for what the guest has not told yet under "What the guest has told": the day, the time, and where they are staying, for a business that goes to its guests ("Goes to its guests: yes"), naming each detail still missing, the day too. When nothing is missing, ask them to confirm the booking with those details. No phone number and no link: the owner pastes the answer in the chat where the guest asked.'
    : // The gentle offer ("The gentle offer"), as decision 0009 reads the
      // libraries: one next step, easy to take, and no hard sell (IG
      // references/voice-rules.md at 550d3cf); make the first step easy, and
      // urgency only when it is real (CH marketing-psychology/SKILL.md at
      // 96798cf).
      '"callToAction": the gentle offer that ends the answer: one short sentence, in your own words, that makes booking feel easy and welcome, from the details; for a business that goes to its guests: when the guest stays in a place "Where it goes" names, that a therapist comes to them there, naming that place as the guest put it; when they have not said where they stay, that a therapist comes to them in the areas the business covers; when they stay anywhere else, the offer never says a therapist comes to them: it names the areas the business covers, or offers to help once the team has checked. One next step, easy to take. It never presses: no "book now", no deadline, no urgency or scarcity, no discount. It never asks where they stay or which area, nor the day or the time (the final answer does that), and names no day or time: the details do not say what is free. A statement, or a short question the guest can answer yes to; never a question with no next step. When "sexual" is true, leave the callToAction\'s text empty and its translation null. No phone number and no link.';
}

// Only the areas the website lists (docs/specs/reviews/better-replies-and-answers,
// "Only the areas the website lists"): the model can't tell where "further
// out" stops, so any other place is the owner's to check.
const AREAS_RULE =
  'Say a therapist comes to a place only when "Where it goes" names it, or one of the neighbourhoods it lists, or the business\'s own town ("Town"). For any other place (one it does not name, or a hotel named without its area), no part says a therapist comes there, promises the travel terms, or names that place in the gentle offer: say the team will check whether they can come there and reply, and set "unanswered" to true; still answer the rest of the message from the details, such as whether a time falls within "Hours". The gentle offer may name the areas the business covers instead.';

// Only when the website is known ("The website, only when asked"): code puts
// the address in place of {website}, so it is never a page that doesn't exist.
const WEBSITE_RULE =
  'Never send the guest to the website, except when they ask to see photos, or want more about a treatment than its description says. Then one short sentence of "answer" says they will find it on the website: write {website}, exactly so, where the address goes, and never a web address of your own, not even one of the business\'s: code puts the address there.';

// The first answer (docs/specs/questions/first-answer, "The first answer"):
// the hello line, the middle and the closing. Code ends the hello line and the
// closing on 😊 and the flower, so the model writes no emoji.
function firstRules(body: QuestionBody): string[] {
  const website = Boolean(body.business.website);
  const hello = goesToGuests(body.business.serviceArea)
    ? '"greeting": the hello line: hi or hello, a thank-you for their message, and straight away that a therapist comes to them where they are staying (their hotel or villa, or the place they named, as they put it), in one or two short sentences, with no name. When they stay in a place "Where it goes" does not name, say instead that the therapists come to guests in the areas the business covers, never to their place.'
    : '"greeting": the hello line: hi or hello and a thank-you for their message, in one or two short sentences, with no name.';
  const noneNamed = website
    ? 'When the message names none of the business\'s treatments (no massage at all, or one in the guest\'s own words that is not clearly one of "Treatments"), ask in one short question which massage they would like, and say in one short sentence that they can see all the massages on the website: write {website}, exactly so, where the address goes, and never a web address of your own: code puts the address there. Never list the treatments, never name one, never give a price.'
    : 'When the message names none of the business\'s treatments (no massage at all, or one in the guest\'s own words that is not clearly one of "Treatments"), ask in one short question which massage they would like. Never list the treatments, never name one, never give a price.';
  const named = `When the message names one or more of the business's treatments, even in other words or another language as long as it is clearly that one, give each by its name as "Treatments" writes it, then each of its lengths with its price on its own line starting with "- ", as the details write them. No other treatment${website ? ', and no website unless they ask to see photos or want more about it than its description: then write {website}' : ''}.`;
  return [
    "This answer replies to the guest's first message: the hello line, the middle, then the closing.",
    hello,
    `"answer": the middle. ${noneNamed} ${named} Then answer anything else the message asks in one short sentence, from the details.`,
    body.final
      ? `${callToAction(true)} It comes before the closing.`
      : '"callToAction": leave its text empty and its translation null: the closing ends this answer.',
    '"closing": one sentence in the first person, as the owner writing: that you are here to answer all their questions and to make their booking easy, in your own words.',
    'No emoji in any part: code adds them.',
    'When "sexual" is true, forget the hello line and the closing: a short greeting, the "professionalOnly" line and a short answer, and leave the closing\'s text empty and its translation null.',
  ];
}

// Any other answer: today's greeting, answer, call to action and emoji.
function laterRules(body: QuestionBody, flower: string): string[] {
  return [
    'When you list treatments, give each with its lengths and their prices, as the details write them: each treatment on its own line when there are more than two, its name, then each length with its price.',
    '"greeting": a short greeting, with no name, ending on its punctuation.',
    `"answer": the answer to each thing the guest asked, in 1 to 4 short sentences, plain and warm, in the business's tone, with the list of treatments when you give one.`,
    callToAction(body.final),
    ...(body.business.website ? [WEBSITE_RULE] : []),
    '"closing": leave its text empty and its translation null.',
    `Emoji: only 😊 and ${flower}, one of each: 😊 at the end of a sentence, in place of its full stop (the greeting, or a sentence of the answer), and ${flower} at the very end of your last part. No emoji when "sexual" is true.`,
  ];
}

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
    `Every part is in the message's language, never in English or ${owner} unless the message is: only the translations are in ${owner}.`,
    'Use only the facts under "Business": its treatments with their durations and prices as written, its hours, its town, its area and where it goes with its travel terms, its highlights, and its contact details only when the guest asks how to reach it. Never invent a treatment, a price, a discount, a free time, a payment method or any other fact.',
    "Name a treatment only as the details write it: never take the guest's words for a treatment's name.",
    'For a business that goes to its guests ("Goes to its guests: yes"), never invite the guest to come, come back or visit, and never speak of a place of the business as where they would be: a therapist comes to where the guest is staying, as its details say.',
    ...(goesToGuests(body.business.serviceArea) ? [AREAS_RULE] : []),
    'When the details do not answer part of the message (a card payment, a free slot tonight, parking), say the team will check and reply, and set "unanswered" to true.',
    ...(body.first ? firstRules(body) : laterRules(body, flower)),
    `"guest": what the guest has told so far about their booking, from "What the guest has told" and this message: where they are staying, the day and the time, each as they put it, written in ${owner}, or null.`,
    sexRule(spa),
    WORD_RULES,
    "Every sentence ends on its full stop, question mark or exclamation mark, except where an emoji takes the full stop's place: then no full stop before or after the emoji.",
    'Never reuse a phrase from these instructions: write as the owner would.',
    'Promise nothing the owner has not decided: no discount, no free extra, no arrival time.',
    `Translate the message and each part into ${owner} for the owner to read, faithfully and plainly, keeping names, numbers and emoji ("questionTranslation" and each "translation"). If the message is already in ${owner}, set them all to null.`,
  ].join('\n');

  const b = body.business;
  const script = guestScript(body.question);
  // Every length with its price (docs/specs/questions/first-answer).
  const treatments = b.offerings.map((o) => {
    const lengths = o.lengths
      .map((length) => [length.duration, length.price].filter(Boolean).join(', '))
      .filter(Boolean)
      .join('; ');
    return `- ${o.name}${lengths ? ` (${lengths})` : ''}${o.description ? `: ${o.description}` : ''}`;
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
    `First message from this guest: ${body.first ? 'yes' : 'no'}`,
    // The guest's letters, when they aren't Latin ("The guest's letters").
    ...(script
      ? [
          `The message is written in ${SCRIPT_NAMES[script]} letters: write every part of the answer in them.`,
        ]
      : []),
    '',
    'Message:',
    body.question,
  ];
  if (body.avoid) {
    lines.push('', 'The owner did not use this answer. Say it differently:', body.avoid);
  }
  return { system, text: lines.join('\n') };
}

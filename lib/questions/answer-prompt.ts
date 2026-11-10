import { BANNED_WORDS } from '@/lib/posts/banned';
import type { ScreenLocale } from '@/lib/reviews/reply';
import type { QuestionBody } from './question';

// What Flash-Lite reads to answer one guest's message
// (docs/specs/questions/answer-drafts, "The answer"). It writes each part on
// its own; code builds the answer from them (lib/questions/checks.ts). No
// example sentence to copy (docs/specs/posts/day-and-night-copy). Bump the
// version with every change.

export const ANSWER_PROMPT_VERSION = 'answer-1';

const LANGUAGES: Record<ScreenLocale, string> = {
  en: 'English',
  id: 'Indonesian',
  vi: 'Vietnamese',
};

function callToAction(final: boolean): string {
  return final
    ? '"callToAction": one sentence that asks the guest to book now, asking only for what the guest has not told yet under "What the guest has told": the day, the time, and where they are staying, for a business that goes to its guests (its "Where it goes" says so). When nothing is missing, ask them to confirm the booking with those details. No phone number and no link: the owner pastes the answer in the chat where the guest asked.'
    : '"callToAction": leave its text empty and its translation null: this answer is not the final one. The answer ends once it has answered: no call to book, and no question back unless you need one to answer (which treatment the guest means).';
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
    'Write in the language of the message (its main language if it mixes several). Give "questionLanguage" as a BCP 47 code ("en", "ru", "vi").',
    'Use only the facts under "Business": its treatments with their durations and prices as written, its hours, its town, its area and where it goes with its travel terms, its highlights, and its contact details only when the guest asks how to reach it. Never invent a treatment, a price, a discount, a free time, a payment method or any other fact.',
    'When the details do not answer part of the message (a card payment, a free slot tonight, parking), say the team will check and reply, and set "unanswered" to true.',
    'When you list treatments, give each with its duration and its price, as the details write them: one per line when there are more than two, its name, its duration, then its price.',
    '"greeting": a short greeting, with no name.',
    `"answer": the answer to each thing the guest asked, in 1 to 4 short sentences, plain and warm, in the business's tone, with the list of treatments when you give one.`,
    callToAction(body.final),
    `"guest": what the guest has told so far about their booking, from "What the guest has told" and this message: where they are staying, the day and the time, each as they put it, written in ${owner}, or null.`,
    sexRule(spa),
    `Never these words, nor anything that suggests more than a professional treatment: ${BANNED_WORDS.join(', ')}.`,
    `Emoji: at most 2, with ${flower} at the very end of your last part (the call to action when there is one, else the answer). No emoji when "sexual" is true.`,
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

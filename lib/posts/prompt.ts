import { BANNED_WORDS } from './banned';
import { POSTS_LIMITS, type Post, type RecentPost } from './batch';
import { FLOWERS } from './emoji';
import type { PostsModelInput } from './input';
import { OFFER_LIMITS, type Offer } from './offer';
import { offerLine, offerTreatment } from './offer-line';
import { type Setup, setupLine } from './setup';

// The post plan's prompts (docs/specs/posts/generate-copy, "What the model
// writes"); the day or night light, the open room and the sign of the guest's
// day from docs/specs/posts/day-and-night-images; the offer line first from
// docs/specs/posts/offer-line-first. Bump the version with every change, so
// eval verdicts trace back to it.
export const POSTS_PROMPT_VERSION = 'posts-10';

// Code decides the emoji rule: flowers only for a spa
// (docs/specs/posts/story-text, "Emojis").
function emojiRule(spa: boolean): string {
  return spa
    ? `Emoji: flowers only, from ${FLOWERS.join(' ')}: 1 to ${POSTS_LIMITS.captionFlowers} in the caption and 1 or ${POSTS_LIMITS.storyFlowers} in the story text. No other emoji.`
    : `At most ${POSTS_LIMITS.otherEmoji} emoji in the caption and at most ${POSTS_LIMITS.otherEmoji} in the story text.`;
}

// Captions built on basic marketing, a hook first and a positive note to end,
// and the story text (docs/specs/posts/story-text, "What the model writes").
// With an offer, the offer line is the hook (docs/specs/posts/offer-line-first).
const captionRules = (spa: boolean, withOffer = false) => `Captions:
- English, in the business's tone words, written to tourists and expats nearby.
- Each caption sells, in this order: a hook, its first line of at most 125 characters, that works on its own and stops a tourist scrolling (a question or a promise they feel, such as "Long flight?"), since it is all Instagram shows before "more"${withOffer ? '; on a post that carries the special offer, the hook is its offer line, word for word, with nothing before it, and a question or a promise may follow it' : ''}; what the guest will feel, rather than what the business does; one concrete detail that makes it real (the treatment, its price or duration when the profile gives them, the place${withOffer ? '; on a post that carries the special offer, never a price and never another session length' : ''}); and a last sentence on a positive note, a good feeling or a warm promise (such as "Wake up light tomorrow.").
- 250 to 700 characters in all. Short paragraphs, no hashtags in the text.
- ${emojiRule(spa)}
- Facts only from the profile: a price, a duration, a number of years, a place name or a claim appears only if the profile holds it, written as the profile writes it. Feelings, senses and place symbols are yours to use freely.
- No call to action and no contact details: the app adds "Book on WhatsApp" with the number after every caption.
- Never these words, nor anything that suggests more than a professional treatment: ${BANNED_WORDS.join(', ')}.

Hashtags: 3 to 5, without "#", lower case, letters and digits only. One or two on the town or area (canggu, danang), the rest on the trade and the moment (massagedanang, aftersurf), drawing on the essence's search terms.

Alt text: at most 125 characters, describing what the image will show, from its image prompt, for someone who can't see it. Never start with "image of".

Story text: a short version of its own caption, for the post's Instagram story, which the owner may paste on the story image: its hook cut down, the one thing that matters, and a positive ending. English, at most ${POSTS_LIMITS.storyAsked} characters, emoji included; one or two short lines. No hashtags, no phone number, no link and no call to action: the owner adds a link sticker.`;

// The special offer's rules, only when the owner set one
// (docs/specs/posts/special-offer, "What the model gets").
const offerRules = (spa: boolean) => `
A special offer is given. Posts 1 and 2 are the two offer posts. Exactly 2 offer posts carry the special offer: each leads on one of the offer's treatments, two different ones when the offer has two or more. Each offer post's caption starts with its offer line, given under "### Special offer", word for word. Never a bigger discount, never other terms, never a price, never another session length, never "today only" or "this week", anywhere in an offer post. Each offer post's story text is its offer line, word for word${spa ? ', followed by one flower' : ''}. The other four posts never mention a discount, a free treatment or a deadline, in their captions or story texts.`;

const rewriteOfferRules = (spa: boolean) => `

A special offer is given. A post marked offer: true keeps the offer: its caption starts with its offer line, given under "### Special offer", word for word, and its story text is that line${spa ? ', followed by one flower' : ''}; the other posts never mention it.`;

// Each post that carries the offer, by name, with its line in full.
function offerText(offer: Offer, lines: [string, string][] = []): string {
  const what =
    offer.kind === 'discount'
      ? `- ${offer.percent}% off`
      : `- Free: ${offer.gift}, with a paid session`;
  return `### Special offer
${what}
- On: ${offer.treatments.join(', ')}
- Sessions: ${OFFER_LIMITS.minutes} minutes or longer
- Until: ${offer.lastDay}${lines.map(([name, line]) => `\n- ${name}'s offer line: ${line}`).join('')}`;
}

// The line of a post, from its set-up's treatment or, for a post saved
// without one, the treatment its caption names.
function lineOf(offer: Offer, setupTreatment: string | undefined, caption = ''): string | null {
  const treatment = offerTreatment(offer, setupTreatment, caption);
  return treatment ? offerLine(offer, treatment) : null;
}

export function planPrompt(withOffer = false, spa = false): string {
  return `You plan six Instagram posts for a small business, for an app that makes its posts. You get the business's brand profile, read from its website and checked by the owner, and the topics of its recent posts.

Each post has a type, a topic, a scene, a caption, a story text, hashtags, alt text and an image prompt.

The mix:
- offer: one treatment or package, what it does for the guest, with its price and duration when the profile gives them.
- moment: a reason people come (after a surf, a hike, a long flight), from the essence's moments.
- local: the town or area and what it's known for, tied back to the business.
- ritual: how a treatment unfolds (the oils, the warm towels, the quiet), never the staff.
- tip: a small piece of care advice tied to the trade (stretch after a dive, drink water after a massage).
- proof: what the profile says about the business (years open, its promise, a rating it quotes). Only when the highlights or the promise give something to say; never an invented review, rating or customer.
At least 2 offer posts, on 2 different offerings when there are two. At most 2 posts of any type, and at least 4 different types. Never repeat the topic of a recent post.${withOffer ? offerRules(spa) : ''}

The topic: one line, at most 12 words, saying what the post is about.

${captionRules(spa, withOffer)}

The image prompt: English, at most 80 words, for an image model making a tall 9:16 photo.
- The massage is in every image: a therapist's hands working on a guest, or oil or towels being used for a treatment. Only what the business offers: a tool or treatment appears only if the offerings hold it. Never a guest alone, never an empty room, never a drink or a prop on its own.
- A guest looks relaxed and alive, with the therapist there: never lying still as if asleep.
- Light follows the set-up's last word. Day: late afternoon, the lamps lit inside the main light, the garden outside, through open doors or a wide window, in soft shade with no sunlight on it; warm and calm, never sunbeams across the room, a sunlit garden or harsh sun. Night: evening, lamps and candles giving the room a warm, golden glow, the garden outside lit by lanterns under a deep blue sky; warm and inviting, never dark or gloomy. Never a grey sky, mist, rain or damp. Never call a room or its light bright.
- Places look clean, tidy and cared for: beds and linens neatly made, nothing rumpled or messy; no mould, stains, wet stone or worn surfaces.
- Rooms are warm and homely, like a boutique hotel or villa; never clinical or hospital-like.
- The room opens onto the outside: open doors, a wide window or a balcony onto green plants that grow in that place, and the sea or a pool where the place has one.
- Still air: curtains open and hanging still, no wind.
- Oil looks like massage oil: golden oil in a clear glass bottle, or poured into a palm; never a small dark bottle that could pass for medicine.
- For a business that goes to its guests (its service area says so), the scene is the guest's hotel room, balcony or villa, never a spa building.
- A guest is shown never from behind. No recognisable face.
- No text, logos or labels anywhere in the image; bottles are plain.
- Use the visual style's palette and textures, and the essence's senses and place symbols.
- Only in a moment post's image, one small, plain object from that moment may show (a surfboard against the balcony rail, hiking boots by the door, a suitcase, a closed laptop): far in the background, half hidden and out of focus, never near the guest and never the subject, with no logo or text. Most images have none.
- Never the business's own premises, products or staff as if real.

The image set-ups: code gives one set-up per post, in order, under "### Image set-ups". Post 1 uses set-up 1, post 2 uses set-up 2, and so on. Each image prompt shows its set-up's treatment, guests, number of therapists, part of the body, scene, camera and light; it never changes them, and never adds a guest or a therapist. It names each guest as "a man" or "a woman", and says "two therapists" when there are two. The therapists are women. The image prompt describes the photo itself: it never writes "scene" or "set-up" in it, nor a scene's name as a label. An offer post leads on its set-up's treatment.

The scene: copy the set-up's scene; every scene shows the massage: treatment (the therapist's hands at work on the guest, from the side), detail (a close view of the hands on the guest's body, such as oil poured onto a back or warm towels laid on a leg; the guest's body is always in the frame), place (the guest's room, balcony or villa with the massage under way in it), or guest (the guest relaxed during the treatment, from above, the therapist's hands in the frame).`;
}

function profileText(input: PostsModelInput): string {
  return `### Brand profile\n${JSON.stringify(input, null, 2)}`;
}

// The plan takes its light from the set-ups, never from the brand's visual
// style (docs/specs/posts/day-and-night-images); the profile, its hash and the
// rewrite keep it.
function withoutLight(input: PostsModelInput): PostsModelInput {
  if (!input.visualStyle) return input;
  const { light: _, ...style } = input.visualStyle;
  return { ...input, visualStyle: style as PostsModelInput['visualStyle'] };
}

// The set-ups come before the offer, so the offer stays the last word.
export function planUserText(
  input: PostsModelInput,
  recent: RecentPost[],
  offer?: Offer,
  setups: Setup[] = [],
): string {
  const lines = recent.length ? recent.map((p) => `- ${p.type}: ${p.topic}`).join('\n') : 'None';
  let text = `${profileText(withoutLight(input))}\n\n### Recent posts\n${lines}`;
  if (setups.length) {
    const list = setups.map((s, i) => `${i + 1}. ${setupLine(s)}`).join('\n');
    text = `${text}\n\n### Image set-ups\n${list}`;
  }
  if (!offer) return text;
  // Posts 1 and 2 use set-ups 1 and 2, whose treatments are the offer's.
  const offerLines = setups.slice(0, 2).flatMap((s, i): [string, string][] => {
    const line = lineOf(offer, s.treatment);
    return line ? [[`Post ${i + 1}`, line]] : [];
  });
  return `${text}\n\n${offerText(offer, offerLines)}`;
}

export function rewritePrompt(withOffer = false, spa = false): string {
  return `The owner changed their business's brand profile. You rewrite the captions, story texts, hashtags and alt text of their Instagram posts so they fit the new profile. Keep each post's type, topic, scene and image prompt: they don't change. Answer every post, with its id.

${captionRules(spa, withOffer)}${withOffer ? rewriteOfferRules(spa) : ''}`;
}

export function rewriteUserText(input: PostsModelInput, posts: Post[], offer?: Offer): string {
  const kept = posts.map(({ id, type, topic, scene, caption, imagePrompt, offer: carries }) => ({
    id,
    type,
    topic,
    scene,
    caption,
    imagePrompt,
    ...(offer && carries ? { offer: true } : {}),
  }));
  const text = `${profileText(input)}\n\n### Posts\n${JSON.stringify(kept, null, 2)}`;
  if (!offer) return text;
  const offerLines = posts.flatMap((p): [string, string][] => {
    const line = p.offer ? lineOf(offer, p.setup?.treatment, p.caption) : null;
    return line ? [[p.id, line]] : [];
  });
  return `${text}\n\n${offerText(offer, offerLines)}`;
}

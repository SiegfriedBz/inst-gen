import { BANNED_WORDS } from './banned';
import { POSTS_LIMITS, type Post, type RecentPost } from './batch';
import { FLOWERS } from './emoji';
import type { PostsModelInput } from './input';
import { OFFER_LIMITS, type Offer } from './offer';
import { offerLine, offerTreatment } from './offer-line';
import { QUESTIONS, type Question, type Setup, setupLine } from './setup';

// The post plan's prompts (docs/specs/posts/generate-copy, "What the model
// writes"); the day or night light, the open room and the sign of the guest's
// day from docs/specs/posts/day-and-night-images; the offer line first from
// docs/specs/posts/offer-line-first; copy that follows the post's light, with
// no example to copy, from docs/specs/posts/day-and-night-copy; hook styles,
// a job per type and story lines from docs/specs/posts/marketing-copy; two
// posts an attempt and never a price from docs/specs/posts/two-suggestions;
// three short paragraphs, a question first, the offer line second, a fact last,
// two flowers and no setting from docs/specs/posts/short-captions; two kinds of
// question, an answer with a person acting, the offer line first again and
// story texts of ten words from its amendment of 2026-11-12. Bump the version
// with every change, so eval verdicts trace back to it.
export const POSTS_PROMPT_VERSION = 'posts-18';

// Code decides the emoji rule: flowers only for a spa
// (docs/specs/posts/story-text, "Emojis").
function emojiRule(spa: boolean): string {
  return spa
    ? `Emoji: flowers only, from ${FLOWERS.join(' ')}: exactly ${POSTS_LIMITS.captionFlowers} in the caption, one right after its first line and one at its very end, and exactly ${POSTS_LIMITS.storyFlowers} in the story text, at its end. No other emoji.`
    : `At most ${POSTS_LIMITS.otherEmoji} emoji in the caption and at most ${POSTS_LIMITS.otherStoryEmoji} in the story text.`;
}

// Each type's job: only offer posts sell (docs/specs/posts/marketing-copy,
// "Each type its job"). The plan and the rewrite share it.
const TYPE_JOBS = `- offer: makes the guest want one treatment or package now: the sore spot it answers and what changes after; its duration when the profile gives it.
- moment: a reason people come (after a surf, a hike, a long flight), from the essence's moments: names that moment in a few words, then what the massage does for it.
- local: the town or area and something it's known for, useful to a visitor, tied back to the business in its last paragraph.
- ritual: the steps of one treatment, in plain words (where it starts, what it works on, how long), never the staff.
- tip: one piece of care advice a guest can use today, worth saving (stretch after a dive, drink water after a massage).
- proof: what the profile says about the business (years open, its promise, a highlight, a rating it quotes), stated plainly. Only when the highlights or the promise give something to say; never an invented review, rating or customer.
Only offer posts sell a treatment; the other types earn the guest's attention, name a treatment once at most, and never in their first line.`;

// The kinds of question code deals (docs/specs/posts/short-captions, amended
// 2026-11-12), each described with no example to copy. The plan reads the part
// of the body from the set-up; a rewrite, from the image prompt it keeps.
const questionWords = (partFrom: string): Record<Question, string> => ({
  sore: `asks the guest about their own sore spot, with "your", and opens on it, named as a part of the body in its own word (legs, feet, shoulders, neck, back, arms, hands, head), the one its ${partFrom} (for "whole body" or "head", one its treatment's description names); then the moment it comes from, one of the essence's moments that fits it, never the same moment in both posts; with a real place of the business when the moment holds none.`,
  ask: 'the question a tourist would ask or type before booking, in the first person (I, my) and their own words, that this business answers from its profile: whether a therapist comes to their room, tonight, what they bring, a deposit, how long.',
});

const questionKinds = (intro: string, partFrom: string) => {
  const words = questionWords(partFrom);
  return `${intro}\n${QUESTIONS.map((kind) => `- ${kind}: ${words[kind]}`).join('\n')}`;
};

// Captions of three paragraphs: a question alone on the first line, its
// answer, one fact; with an offer, the offer line first, the question and its
// answer after it; no price and no example to copy (docs/specs/posts/short-captions,
// amended 2026-11-12); the story text, a line of its own of ten words at most.
// The copy follows the post's light (docs/specs/posts/day-and-night-copy).
const captionRules = (
  spa: boolean,
  withOffer = false,
  lightFrom = 'the last word of its set-up',
) => `Captions:
- English, in the business's tone words, written as its owner would, to tourists and expats nearby.
- The first line is the hook, alone on its line: a short question that ends with "?", at most 12 words and 125 characters, of its post's kind, in the words a tourist would use. It stops a tourist scrolling, since it is all Instagram shows before "more". Never a question about how the guest feels, and never one that names only a mood: a long day, a break, unwinding, stress.${withOffer ? ' A post that carries the special offer opens on its offer line instead, alone on its first line; its question opens the second paragraph.' : ''}
- Then two more paragraphs, with a blank line between them: three in all, never more. The second is the answer: it says what the massage does for the guest, plainly, doing its type's job, in two short sentences of at most ${POSTS_LIMITS.sentenceAsked} words each, one idea each. It answers the question, and nothing else in the caption is a question.${withOffer ? ' On a post that carries the special offer, the second paragraph opens on its question, then answers it, so its caption is three blocks: its offer line, its question with the answer, its fact.' : ''} The third is one fact from the profile's highlights, stated plainly in one short sentence: never the same highlight in both captions. It stands alone in its paragraph, on every post.
- In the answer, a person does the acting: "we", the therapist or "you"; never the pressure, the strokes, the massage, the oil or the towels. The result is physical and soon: the sore spot loosened, the rest of the guest's day or evening, tomorrow's hike or flight. For a business that comes to its guests (its promise or service area says so), one sentence of the answer says a therapist comes to the guest's own hotel room, apartment or villa, as its profile writes it; both captions say it, each in its own words. Each sentence holds something a guest could check: who comes, where, how long, what they bring, which part of the body.
- Never describe the setting: the light, the sky, the sunset, the garden, the room, the lamps, candles or linens, the oil's colour, or how quiet, calm or peaceful it is. Never describe what the photo shows: the image prompt's light, room and garden are for the image only. The story text follows the same rule.
- Each caption names one of the business's real places, as its profile writes it, in its hook or the paragraph right after it: its town or area, a place it serves, or a landmark among its place symbols. A flower, a plant, an oil or an object is never a place; a caption may still use one as a detail, as it may a moment from its essence.
- The caption ends on its fact, warm and plain, and never asks the guest to book or message. No two endings start with the same word.
- A caption or story text that says when follows its post's light, ${lightFrom}: a day post speaks of the guest's afternoon, with the evening still ahead, never of sleep, bed or waking up; a night post of the guest's evening, the day done, never of the afternoon, the midday sun or the morning just past. It need not say when, and never describes the light.
- The captions open differently and end differently: never the same first sentence, never the same last sentence, and never the same idea said twice in other words. Never reuse a phrase from these instructions or from the image set-ups: the set-ups describe the photos.
- Plain, concrete words: never a word that only adds intensity, such as completely, deeply, truly, ultimate or pure.
- Never "Imagine…", a "not this, it's that" contrast, an em dash (—), three adjectives in a row, or these words: unwind, indulge, pamper, oasis, escape, melt away, soothe.
- ${POSTS_LIMITS.captionMin} to ${POSTS_LIMITS.captionAsked} characters in all, the hook included, before the app's WhatsApp line. No hashtags in the text.
- ${emojiRule(spa)}
- Never a price, in a caption or a story text.
- Facts only from the profile: a duration, a number of years, a place name, a quality (signature, expert, best) or a claim appears only if the profile holds it, written as the profile writes it. Feelings and place symbols are yours to use, in a few words.
- No call to action and no contact details, ever: the app adds its own booking line with the number after the caption, so the caption never writes one. Its last paragraph is its fact.${withOffer ? " On a post that carries the special offer, the app's line also gives the offer's end." : ''}
- Never these words, nor anything that suggests more than a professional treatment: ${BANNED_WORDS.join(', ')}.

Hashtags: 3 to 5, without "#", lower case, letters and digits only. One on the business's town or area, as its profile names it; the others on the post's treatment, moment or place, drawing on the essence's search terms. Never a town or area the profile doesn't name.

Alt text: at most 125 characters, describing what the image will show, from its image prompt, for someone who can't see it. Never start with "image of".

Story text: its own line for the post's Instagram story, which the owner pastes on the story image above a link sticker to WhatsApp, read in two seconds: at most ${POSTS_LIMITS.storyWords} words and ${POSTS_LIMITS.storyAsked} characters, emoji included, one idea. It names the post's sore spot or moment in a few words and what the business does about it, often as a short question and its answer. Never the treatment's name alone, never the caption's first sentence, never a price. English. No hashtags, no phone number, no link and no call to action, and never the words book, reserve, WhatsApp, message, DM or click: the sticker asks. It follows the captions' rules on the setting, the clichés and the light.`;

// The special offer's rules, only when the owner set one
// (docs/specs/posts/special-offer, "What the model gets").
const offerRules = (spa: boolean) => `
A special offer is given. Posts 1 and 2 are the two offer posts. Both carry the special offer: each leads on one of the offer's treatments, two different ones when the offer has two or more. Each offer post's caption opens on its offer line, given under "### Special offer", word for word, alone on its first line; its question opens the second paragraph, and the answer follows it. Never a bigger discount, never other terms, never a price, never another session length, never "today only" or "this week", anywhere in an offer post. Each offer post's story text is its offer line, word for word${spa ? ', followed by one flower' : ''}.`;

const rewriteOfferRules = (spa: boolean) => `

A special offer is given. A post marked offer: true keeps the offer: its caption opens on its offer line, given under "### Special offer", word for word, alone on its first line, its question opening the second paragraph, and its story text is that line${spa ? ', followed by one flower' : ''}; the other posts never mention it.`;

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
  return `You plan two Instagram posts for a small business, and write them as its owner would, to guests nearby. You get the business's brand profile, read from its website and checked by the owner, and the topics of its recent posts.

Each post has a type, a topic, a scene, a caption, a story text, hashtags, alt text and an image prompt.

The mix, each type with its own job:
${TYPE_JOBS}
${withOffer ? 'Posts 1 and 2 are both offer posts.' : 'Post 1 is an offer post. Post 2 is one of the other types: moment, local, ritual, tip or proof.'} Never repeat the topic of a recent post.${withOffer ? offerRules(spa) : ''}

The topic: one line, at most 12 words, saying what the post is about.

${questionKinds('The questions: code gives each post its kind of question, in order, under "### Questions": post 1 takes question 1, and so on.', 'set-up gives')}

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
    // Each post's kind of question (docs/specs/posts/short-captions, amended
    // 2026-11-12).
    const kinds = setups.flatMap((s, i) => (s.question ? [`${i + 1}. ${s.question}`] : []));
    if (kinds.length) text = `${text}\n\n### Questions\n${kinds.join('\n')}`;
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

Each post keeps its type's job:
${TYPE_JOBS}

${questionKinds('The questions: each post\'s "question" names its kind; a post without one keeps the kind of question it has.', 'image prompt shows')}

${captionRules(spa, withOffer, 'its "light"')}${withOffer ? rewriteOfferRules(spa) : ''}`;
}

export function rewriteUserText(input: PostsModelInput, posts: Post[], offer?: Offer): string {
  const kept = posts.map(
    ({ id, type, topic, scene, setup, caption, imagePrompt, offer: carries }) => ({
      id,
      type,
      topic,
      scene,
      // A post saved without a set-up, or a set-up without a light, is a day.
      light: setup?.light ?? 'day',
      // Its kind of question, when code dealt one (docs/specs/posts/short-captions,
      // amended 2026-11-12).
      ...(setup?.question ? { question: setup.question } : {}),
      caption,
      imagePrompt,
      ...(offer && carries ? { offer: true } : {}),
    }),
  );
  const text = `${profileText(input)}\n\n### Posts\n${JSON.stringify(kept, null, 2)}`;
  if (!offer) return text;
  const offerLines = posts.flatMap((p): [string, string][] => {
    const line = p.offer ? lineOf(offer, p.setup?.treatment, p.caption) : null;
    return line ? [[p.id, line]] : [];
  });
  return `${text}\n\n${offerText(offer, offerLines)}`;
}

// New words for one post, for the same image (docs/specs/platform/easier-to-use,
// "New texts for a suggestion"): the rewrite's rules, something different from
// its caption now, and nothing of the attempt's other post.
export function newTextsPrompt(withOffer = false, spa = false): string {
  return `The owner of a small business wants new words for one of their Instagram posts, for the same image. You write a new caption and a new story text for the post under "### Post", as its owner would, to guests nearby. Keep its type, topic, scene, light and image prompt: they don't change. Answer that post, with its id, and give its hashtags and alt text as they are.

Something different: open on a different question of the kind its "question" names, in other words than its caption now, and with another fact from the highlights when the profile has one. Never the fact, the opening or the ending of the post under "### Other post": it goes out beside this one.

The post keeps its type's job:
${TYPE_JOBS}

${questionKinds('The questions: the post\'s "question" names its kind; a post without one keeps the kind of question it has.', 'image prompt shows')}

${captionRules(spa, withOffer, 'its "light"')}${withOffer ? rewriteOfferRules(spa) : ''}`;
}

export function newTextsUserText(
  input: PostsModelInput,
  post: Post,
  other: Post | undefined,
  offer?: Offer,
): string {
  const { id, type, topic, scene, setup, caption, storyText, imagePrompt } = post;
  const carries = offer !== undefined && post.offer === true;
  const sent = {
    id,
    type,
    topic,
    scene,
    // A post saved without a set-up, or a set-up without a light, is a day.
    light: setup?.light ?? 'day',
    ...(setup?.question ? { question: setup.question } : {}),
    caption,
    ...(storyText ? { storyText } : {}),
    imagePrompt,
    ...(carries ? { offer: true } : {}),
  };
  let text = `${profileText(input)}\n\n### Post\n${JSON.stringify(sent, null, 2)}`;
  if (other) {
    const story = other.storyText ? `\nStory text: ${other.storyText}` : '';
    text = `${text}\n\n### Other post\nCaption: ${other.caption}${story}`;
  }
  if (!offer) return text;
  const line = carries ? lineOf(offer, setup?.treatment, caption) : null;
  return `${text}\n\n${offerText(offer, line ? [[id, line]] : [])}`;
}

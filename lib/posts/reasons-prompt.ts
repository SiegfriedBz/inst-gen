import { BANNED_WORDS } from './banned';
import { POSTS_LIMITS } from './batch';
import {
  ALT_RULES,
  emojiRule,
  HASHTAG_RULES,
  IMAGE_RULES,
  offerRules,
  rewriteOfferRules,
} from './prompt';
import { samplesText } from './samples';

// The posts' prompts for a business that comes to its guests
// (docs/specs/posts/reasons-to-book, "What the model gets"): what a post is
// for before any rule, the five reasons to book code deals, the caption, fact
// and story rules, five sample posts of a made-up business, and the image
// rules unchanged. Every other business keeps lib/posts/prompt.ts's posts-18.
// Bump the version with every change, so eval verdicts trace back to it.
export const REASONS_PROMPT_VERSION = 'posts-19';

const GOAL = `Who reads these posts: a tourist or expat near the business, on their phone, often in their hotel room, apartment or villa. What a post is for: it makes them want a massage today from this business, which comes to them, so they message it. Its edge over any spa: the guest never leaves their room, with no taxi there and back and nothing to get dressed for afterwards.`;

const reasonRules = (
  intro: string,
  partFrom: string,
) => `${intro} Each post sells its reason, to the guests its set-up shows:
- dayOut: the guest's body after a day out: a walk, a climb, a hike, a surf. Its question names the part of the body its ${partFrom}, in its own word (legs, feet, shoulders, neck, back, arms, hands, head; for "whole body", one its treatment's description names), and the day out it comes from: one of the essence's moments about a day out, or one of the business's real places, never the same moment in both posts.
- stayIn: the guest would rather not go out: it's late, it's raining, or the kids are asleep. Its question names that moment; the answer says they don't have to go anywhere.
- twoOfYou: two guests, a couple or friends, both massaged at the same time, side by side, each with their own therapist.
- firstNight: the guest has just landed after a long flight. Its question names the flight in their body: a stiff back, neck or legs.
- laptop: days of work on a laptop. Its question names the screen days in their neck, shoulders or back.
A moment of the essence about a flight is firstNight's, one about a laptop or work is laptop's, the others are dayOut's.`;

const captionRules = (
  spa: boolean,
  withOffer: boolean,
  lightFrom: string,
  factFrom: string,
) => `Captions:
- English, in the business's tone words, written as its owner would, to tourists and expats nearby.
- Three paragraphs, with a blank line between them: never more.
- The first line is the question, alone on its line: the post's reason, asked to the guest with "you" or "your", in a tourist's own words, about the moment they are living. It ends with "?", at most 12 words and 125 characters: it is all Instagram shows before "more". Never in the first person (I, my, me, we, our, us): the business writes the post, and the question is about the guest. Never a question that names only a mood: a long day, a break, unwinding, stress.${withOffer ? ' A post that carries the special offer opens on its offer line instead, alone on its first line; its question opens the second paragraph.' : ''}
- The second paragraph answers it: what the guest gets and how easy it is, in two short sentences of at most ${POSTS_LIMITS.sentenceAsked} words each. It says a therapist comes to the guest's own hotel room, apartment or villa, as the profile writes it, and what changes for the rest of their day or evening, the guest's body and plans named in a few words. It may name the post's treatment. A person does the acting: "we", the therapist or "you"; never the pressure, the strokes, the massage, the oil or the towels. Nothing else in the caption is a question.${withOffer ? ' On a post that carries the special offer, the second paragraph opens on its question, then answers it.' : ''}
- The third paragraph is the post's fact, ${factFrom}, in one short sentence, as the profile writes it; for "Hours: …", until when the business comes, every day, in a few words. A post with no fact ends on its second paragraph.
- The caption speaks to the guests its set-up shows: two guests on a couple massage are both massaged at once, side by side, each with a therapist; one guest is massaged alone.
- Never describe the setting: the light, the sky, the sunset, the garden, the room, the lamps, candles or linens, the oil's colour, or how quiet, calm or peaceful it is. Never describe what the photo shows: the image prompt's light, room and garden are for the image only. The story text follows the same rule.
- Each caption names one of the business's real places, as its profile writes it, in its question or the paragraph right after it: its town or area, a place it serves, or a landmark among its place symbols. A flower, a plant, an oil or an object is never a place.
- A caption or story text that says when follows its post's light, ${lightFrom}: a day post speaks of the guest's afternoon, with the evening still ahead, never of sleep, bed or waking up; a night post of the guest's evening, the day done, never of the afternoon, the midday sun or the morning just past.
- The captions open differently and end differently, and never say the same idea twice in other words. Never reuse a phrase from the image set-ups: they describe the photos.
- Plain, concrete words: never a word that only adds intensity, such as completely, deeply, truly, ultimate or pure.
- Never "Imagine…", a "not this, it's that" contrast, an em dash (—), three adjectives in a row, or these words: unwind, indulge, pamper, oasis, escape, melt away, soothe.
- ${POSTS_LIMITS.captionMin} to ${POSTS_LIMITS.captionAsked} characters in all, before the app's WhatsApp line. No hashtags in the text.
- ${emojiRule(spa)}
- Never a price, in a caption or a story text.
- Facts only from the profile: a duration, a number of years, a place name, a quality (signature, expert, best) or a claim appears only if the profile holds it, written as the profile writes it.
- No call to action and no contact details, ever: the app adds its own booking line with the number after the caption.${withOffer ? " On a post that carries the special offer, the app's line also gives the offer's end." : ''}
- Never these words, nor anything that suggests more than a professional treatment: ${BANNED_WORDS.join(', ')}.

${HASHTAG_RULES}

${ALT_RULES}

Story text: its own line for the post's Instagram story, which the owner pastes on the story image above a link sticker to WhatsApp, read in two seconds: at most ${POSTS_LIMITS.storyWords} words and ${POSTS_LIMITS.storyAsked} characters, emoji included, one idea. It names the post's moment in a few words and says the business comes to the guest, at the post's time of day. Never advice, never the treatment's name alone, never the caption's first sentence, never a price. English. No hashtags, no phone number, no link and no call to action, and never the words book, reserve, WhatsApp, message, DM or click: the sticker asks. It follows the captions' rules on the setting, the clichés and the light.`;

// A caption update and new texts read each post's reason and fact.
const REWRITE_REASONS =
  'The reasons: each post\'s "reason" names it. A post without a "reason" takes stayIn.';

export function reasonsPlanPrompt(withOffer = false, spa = false): string {
  return `${GOAL}

You plan two Instagram posts for this business, and write them as its owner would. You get its brand profile, read from its website and checked by the owner, and the topics of its recent posts.

Each post has a type, a topic, a scene, a caption, a story text, hashtags, alt text and an image prompt.

${withOffer ? 'Posts 1 and 2 are both offer posts.' : 'Post 1 is an offer post and post 2 a moment post.'} Both sell, each through its reason to book. Never repeat the topic of a recent post.${withOffer ? offerRules(spa) : ''}

The topic: one line, at most 12 words, saying what the post is about.

${reasonRules('The reasons: code gives each post its reason to book today, under "### Reasons": post 1 takes reason 1, and so on.', 'set-up gives')}

${captionRules(spa, withOffer, 'the last word of its set-up', 'given under "### Facts"')}

${samplesText()}

${IMAGE_RULES}`;
}

export function reasonsRewritePrompt(withOffer = false, spa = false): string {
  return `The owner changed their business's brand profile. You rewrite the captions, story texts, hashtags and alt text of their Instagram posts so they fit the new profile. Keep each post's type, topic, scene and image prompt: they don't change. Answer every post, with its id.

${GOAL}

${reasonRules(REWRITE_REASONS, 'image prompt shows')}

${captionRules(spa, withOffer, 'its "light"', 'given as its "fact"')}

${samplesText()}${withOffer ? rewriteOfferRules(spa) : ''}`;
}

export function reasonsNewTextsPrompt(withOffer = false, spa = false): string {
  return `The owner of a small business wants new words for one of their Instagram posts, for the same image. You write a new caption and a new story text for the post under "### Post", as its owner would, to guests nearby. Keep its type, topic, scene, light and image prompt: they don't change. Answer that post, with its id. Give "hashtags" as [] and "altText" as "": the post keeps its own.

Something different: "captionNow" and "storyTextNow" are its words now, which the owner wants replaced. Open on a different question for its reason, and reuse no sentence of its caption now, nor of its story text now. An answer that repeats its question is refused. For dayOut, the part of the body stays the one its image prompt shows: ask after another day out, or in other words. Its "fact" is new: use it. Never the fact, the opening or the ending of the post under "### Other post": it goes out beside this one.

${GOAL}

${reasonRules(REWRITE_REASONS, 'image prompt shows')}

${captionRules(spa, withOffer, 'its "light"', 'given as its "fact"')}

${samplesText()}${withOffer ? rewriteOfferRules(spa) : ''}`;
}

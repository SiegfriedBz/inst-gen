import { BANNED_WORDS } from './banned';
import type { Post, RecentPost } from './batch';
import type { PostsModelInput } from './input';

// The post plan's prompts (docs/specs/posts/generate-copy, "What the model
// writes"). Bump the version with every change, so eval verdicts trace back to it.
export const POSTS_PROMPT_VERSION = 'posts-1';

const CAPTION_RULES = `Captions:
- English, in the business's tone words, written to tourists and expats nearby.
- A first line of at most 125 characters that works on its own: it is all Instagram shows before "more".
- 250 to 700 characters in all. Short paragraphs, no hashtags in the text, at most 2 emoji.
- Facts only from the profile: a price, a duration, a number of years, a place name or a claim appears only if the profile holds it, written as the profile writes it. Feelings, senses and place symbols are yours to use freely.
- No call to action and no contact details: the app adds "Book on WhatsApp" with the number after every caption.
- Never these words, nor anything that suggests more than a professional treatment: ${BANNED_WORDS.join(', ')}.

Hashtags: 3 to 5, without "#", lower case, letters and digits only. One or two on the town or area (canggu, danang), the rest on the trade and the moment (massagedanang, aftersurf), drawing on the essence's search terms.

Alt text: at most 125 characters, describing what the image will show, from its image prompt, for someone who can't see it. Never start with "image of".`;

export function planPrompt(): string {
  return `You plan six Instagram posts for a small business, for an app that makes its posts. You get the business's brand profile, read from its website and checked by the owner, and the topics of its recent posts.

Each post has a type, a topic, a scene, a caption, hashtags, alt text and an image prompt.

The mix:
- offer: one treatment or package, what it does for the guest, with its price and duration when the profile gives them.
- moment: a reason people come (after a surf, a hike, a long flight), from the essence's moments.
- local: the town or area and what it's known for, tied back to the business.
- ritual: how a treatment unfolds (the oils, the warm towels, the quiet), never the staff.
- tip: a small piece of care advice tied to the trade (stretch after a dive, drink water after a massage).
- proof: what the profile says about the business (years open, its promise, a rating it quotes). Only when the highlights or the promise give something to say; never an invented review, rating or customer.
At least 2 offer posts, on 2 different offerings when there are two. At most 2 posts of any type, and at least 4 different types. Never repeat the topic of a recent post.

The topic: one line, at most 12 words, saying what the post is about.

${CAPTION_RULES}

The image prompt: English, at most 80 words, for an image model making a tall 9:16 photo.
- Light is always low, soft and warm: dusk, a lamp, lanterns, candles. Never bright sun, grey sky, mist, rain or damp.
- Places look clean and cared for: no mould, stains, wet stone or worn surfaces.
- For a business that goes to its guests (its service area says so), the scene is the guest's hotel room, balcony or villa, never a spa building.
- No guest at rest seen from behind: a guest is shown never from behind. No recognisable face.
- No text, logos or labels anywhere in the image; bottles are plain.
- Use the visual style's palette, light and textures, and the essence's senses and place symbols.
- Never the business's own premises, products or staff as if real.

The scene: treatment (hands at work), detail (oils, stones, towels, flowers), place (the room, deck or town), or guest (a person at rest, never from behind). At most 2 posts of any scene.`;
}

function profileText(input: PostsModelInput): string {
  return `### Brand profile\n${JSON.stringify(input, null, 2)}`;
}

export function planUserText(input: PostsModelInput, recent: RecentPost[]): string {
  const lines = recent.length ? recent.map((p) => `- ${p.type}: ${p.topic}`).join('\n') : 'None';
  return `${profileText(input)}\n\n### Recent posts\n${lines}`;
}

export function rewritePrompt(): string {
  return `The owner changed their business's brand profile. You rewrite the captions, hashtags and alt text of their Instagram posts so they fit the new profile. Keep each post's type, topic, scene and image prompt: they don't change. Answer every post, with its id.

${CAPTION_RULES}`;
}

export function rewriteUserText(input: PostsModelInput, posts: Post[]): string {
  const kept = posts.map(({ id, type, topic, scene, caption, imagePrompt }) => ({
    id,
    type,
    topic,
    scene,
    caption,
    imagePrompt,
  }));
  return `${profileText(input)}\n\n### Posts\n${JSON.stringify(kept, null, 2)}`;
}

import type { Post } from '@/lib/posts/batch';

export function post(overrides: Partial<Post> = {}): Post {
  return {
    id: 'p1',
    type: 'offer',
    topic: 'Balinese massage at your villa',
    scene: 'treatment',
    caption: 'Warm oil, slow hands.',
    cta: 'Book on WhatsApp: +6281234567890',
    hashtags: ['canggu', 'balimassage', 'aftersurf'],
    altText: 'Hands pressing warm oil into shoulders on a villa deck at dusk',
    imagePrompt: 'A villa deck at dusk',
    unchecked: [],
    ...overrides,
  };
}

const TYPES = ['offer', 'offer', 'moment', 'local', 'ritual', 'tip'];
const SCENES = ['treatment', 'detail', 'place', 'guest', 'treatment', 'detail'];

// A model post, as the plan's model writes it.
export function modelPost(i: number) {
  return {
    type: TYPES[i % 6],
    topic: `Topic ${i + 1}`,
    scene: SCENES[i % 6],
    caption: `Caption ${i + 1}. Warm oil and slow hands after a day in Canggu.`,
    hashtags: ['#Canggu', 'balimassage', 'aftersurf'],
    altText: 'Hands pressing warm oil into shoulders on a villa deck at dusk',
    imagePrompt: `Scene ${i + 1} on a villa deck at dusk`,
  };
}

// A recorded post plan whose partials grow one post at a time.
export function planRecording(count = 6) {
  const posts = Array.from({ length: count }, (_, i) => modelPost(i));
  return {
    modelId: 'gemini-3.5-flash-lite',
    promptVersion: 'posts-1',
    partials: posts.map((_, i) => ({ posts: posts.slice(0, i + 1) })),
    final: { posts },
  };
}

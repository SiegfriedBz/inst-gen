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

// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, test } from 'vitest';
import { PostCard } from '@/components/posts/post-card';
import type { Flag, Post } from '@/lib/posts/batch';
import type { SavedImage } from '@/lib/posts/image-store';
import messages from '@/messages/en.json';
import { post } from './helpers/posts';

// The suggestion in three boxed parts, each with its button under it
// (docs/specs/posts/story-text, "What the owner sees").

afterEach(cleanup);

const CTA = 'Book on WhatsApp: +6281234567890';
const image: SavedImage = {
  postId: 'p1',
  batchId: 'b1',
  ownerId: 'svarga',
  story: new Blob(['s'], { type: 'image/jpeg' }),
  post: new Blob(['p'], { type: 'image/jpeg' }),
  imagePrompt: 'x',
  model: 'm',
  promptVersion: 'images-6',
  createdAt: '2026-10-25T10:00:00.000Z',
};

function show(p: Post, opts: { imagesOn?: boolean; storyFlags?: Flag[] } = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
      <PostCard
        post={p}
        cta={CTA}
        imagesOn={opts.imagesOn ?? true}
        image={{ state: { kind: 'ready', image }, onNewImage: () => {} }}
        onSave={() => {}}
        storyFlags={opts.storyFlags}
        saveImages={<button type="button">save-slot</button>}
        copyPost={<button type="button">copy-post-slot</button>}
        copyStory={<button type="button">copy-story-slot</button>}
        translation={<p>caption-translation</p>}
        storyTranslation={<p>story-translation</p>}
      />
    </NextIntlClientProvider>,
  );
}

const precedes = (a: Node, b: Node) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('the three parts', () => {
  test('with images: Images, Post text and Story text (optional), numbered, each with its button', () => {
    const { container } = show(post({ storyText: 'Long flight? 🌸' }));
    const parts = screen.getAllByRole('region');
    expect(parts.map((part) => part.getAttribute('aria-labelledby') && part)).toHaveLength(3);
    const images = screen.getByRole('region', { name: 'Images' });
    const text = screen.getByRole('region', { name: 'Post text' });
    const story = screen.getByRole('region', { name: 'Story text (optional)' });
    expect(parts).toEqual([images, text, story]);
    expect(within(images).getByRole('heading').textContent).toBe('1Images');
    expect(within(text).getByRole('heading').textContent).toBe('2Post text');
    expect(within(story).getByRole('heading').textContent).toBe('3Story text (optional)');
    expect(within(images).getByText('save-slot')).toBeTruthy();
    expect(within(images).getByText('Post')).toBeTruthy();
    expect(within(images).getByText('Story')).toBeTruthy();
    expect(within(text).getByText('copy-post-slot')).toBeTruthy();
    expect(within(story).getByText('Long flight? 🌸')).toBeTruthy();
    expect(within(story).getByText('story-translation')).toBeTruthy();
    expect(within(story).getByText('copy-story-slot')).toBeTruthy();
    // Nothing outside the parts.
    const article = container.querySelector('article');
    expect([...(article?.children ?? [])].every((child) => child.tagName === 'SECTION')).toBe(true);
  });

  test('without images: Post text 1 and Story text 2, no save button', () => {
    show(post({ storyText: 'Long flight? 🌸' }), { imagesOn: false });
    expect(screen.queryByRole('region', { name: 'Images' })).toBeNull();
    expect(screen.queryByText('save-slot')).toBeNull();
    expect(
      within(screen.getByRole('region', { name: 'Post text' })).getByRole('heading').textContent,
    ).toBe('1Post text');
    expect(
      within(screen.getByRole('region', { name: 'Story text (optional)' })).getByRole('heading')
        .textContent,
    ).toBe('2Story text (optional)');
  });

  test('a post without a story text has no story part', () => {
    show(post());
    expect(screen.queryByRole('region', { name: 'Story text (optional)' })).toBeNull();
    expect(screen.queryByText('copy-story-slot')).toBeNull();
    expect(screen.getAllByRole('region')).toHaveLength(2);
  });

  test('"Edit the text" comes before the translation, then the copy button', () => {
    show(post({ storyText: 'Long flight? 🌸' }));
    const text = screen.getByRole('region', { name: 'Post text' });
    const edit = within(text).getByRole('button', { name: 'Edit the text' });
    const translation = within(text).getByText('caption-translation');
    const copy = within(text).getByText('copy-post-slot');
    expect(precedes(edit, translation)).toBe(true);
    expect(precedes(translation, copy)).toBe(true);
  });

  test("the story text's warnings show in its part", () => {
    show(post({ storyText: 'Only 900k tonight 🌸' }), {
      storyFlags: [{ kind: 'price', text: '900k' }],
    });
    const story = screen.getByRole('region', { name: 'Story text (optional)' });
    expect(within(story).getByRole('note').textContent).toContain('900k');
    expect(
      within(screen.getByRole('region', { name: 'Post text' })).queryByRole('note'),
    ).toBeNull();
  });
});

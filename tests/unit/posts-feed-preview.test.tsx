// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { FeedPreview } from '@/components/posts/feed-preview';
import type { PostBatch } from '@/lib/posts/batch';
import { imageKey, type SavedImage } from '@/lib/posts/image-store';
import messages from '@/messages/en.json';
import { post } from './helpers/posts';

beforeEach(() => {
  vi.stubGlobal(
    'URL',
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const types = ['offer', 'offer', 'moment', 'local', 'ritual', 'tip'] as const;
const batch: PostBatch = {
  id: 'b1',
  ownerId: 'sen',
  createdAt: '2026-10-25T09:00:00.000Z',
  profileReadAt: '2026-10-24T09:00:00.000Z',
  profileHash: 'h',
  promptVersion: 'posts-2',
  model: 'm',
  posts: types.map((type, i) => post({ id: `post-${i + 1}`, type, altText: `Alt ${i + 1}` })),
  dropped: [],
};

function image(postId: string): SavedImage {
  return {
    postId,
    batchId: 'b1',
    ownerId: 'sen',
    story: new Blob(['s'], { type: 'image/jpeg' }),
    post: new Blob(['p'], { type: 'image/jpeg' }),
    imagePrompt: 'x',
    model: 'm',
    promptVersion: 'images-3',
    createdAt: '2026-10-25T10:00:00.000Z',
  };
}

function show(images: Map<string, SavedImage>, onPick = vi.fn()) {
  render(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
      <FeedPreview batch={batch} images={images} onPick={onPick} />
    </NextIntlClientProvider>,
  );
  return onPick;
}

const all = new Map(batch.posts.map((p) => [imageKey('b1', p.id), image(p.id)]));

describe('the feed preview', () => {
  test('tiles show post 6 first', () => {
    show(all);
    const tiles = screen.getAllByRole('button');
    expect(tiles).toHaveLength(6);
    expect(tiles[0].getAttribute('aria-label')).toBe('Post 6');
    expect(tiles[5].getAttribute('aria-label')).toBe('Post 1');
    expect(tiles.filter((tile) => tile.querySelector('img'))).toHaveLength(6);
  });

  test('a post with no image shows its type', () => {
    const some = new Map(all);
    some.delete(imageKey('b1', 'post-3'));
    show(some);
    const tile = screen.getByRole('button', { name: 'Post 3' });
    expect(tile.querySelector('img')).toBeNull();
    expect(tile.textContent).toContain('Why people come');
  });

  test('a tap picks the post', () => {
    const onPick = show(all);
    fireEvent.click(screen.getByRole('button', { name: 'Post 3' }));
    expect(onPick).toHaveBeenCalledWith('post-3');
  });

  test('the title and the order note show', () => {
    show(all);
    expect(screen.getByText('Your feed once these are posted')).toBeTruthy();
    expect(
      screen.getByText('Post them from 1 to 6: the last one you post shows first.'),
    ).toBeTruthy();
  });
});

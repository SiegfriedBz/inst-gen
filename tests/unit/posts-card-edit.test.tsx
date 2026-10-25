// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { PostCard } from '@/components/posts/post-card';
import type { Post } from '@/lib/posts/batch';
import { INSTAGRAM_CAPTION_MAX, type PostEdit, postText } from '@/lib/posts/edit';
import type { SavedImage } from '@/lib/posts/image-store';
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

const CTA = 'Book on WhatsApp: +6281234567890';
const image: SavedImage = {
  postId: 'p1',
  batchId: 'b1',
  ownerId: 'svarga',
  story: new Blob(['s'], { type: 'image/jpeg' }),
  post: new Blob(['p'], { type: 'image/jpeg' }),
  imagePrompt: 'A villa deck at dusk',
  model: 'm',
  promptVersion: 'images-3',
  createdAt: '2026-10-25T10:00:00.000Z',
};

function show(
  p: Post,
  opts: { onSave?: (edit: PostEdit) => void; busy?: boolean; withImage?: boolean } = {},
) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
      <PostCard
        post={p}
        cta={CTA}
        number={1}
        image={opts.withImage ? { state: { kind: 'ready', image } } : undefined}
        onSave={opts.onSave ?? (() => {})}
        busy={opts.busy}
      />
    </NextIntlClientProvider>,
  );
}

const field = (name: string) => screen.getByLabelText(name) as HTMLInputElement;
const save = () => screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;

describe('a post card', () => {
  test("the card follows the mockup's order", () => {
    const { container } = show(post(), { withImage: true });
    const text = container.textContent ?? '';
    const order = [
      'See the story',
      'Offer',
      'Post 1',
      'Warm oil, slow hands.',
      CTA,
      '#canggu',
      'Image description',
      'Edit',
    ].map((part) => text.indexOf(part));
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  test('an edited card says Edited', () => {
    show(post({ edited: true }));
    expect(screen.getByText('Edited')).toBeTruthy();
  });
});

describe('editing a post', () => {
  test('edit and save hands the new words over', () => {
    const onSave = vi.fn();
    show(post(), { onSave });
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(field('Caption'), { target: { value: 'Slow hands, only 990k.' } });
    fireEvent.change(field('Hashtags'), { target: { value: '#Canggu spa' } });
    fireEvent.click(save());
    expect(onSave).toHaveBeenCalledWith({
      caption: 'Slow hands, only 990k.',
      hashtags: '#Canggu spa',
      altText: 'Hands pressing warm oil into shoulders on a villa deck at dusk',
    });
    expect(screen.queryByLabelText('Caption')).toBeNull();
  });

  test('cancel puts the fields back', () => {
    const onSave = vi.fn();
    show(post(), { onSave });
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(field('Caption'), { target: { value: 'Something else.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Warm oil, slow hands.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(field('Caption').value).toBe('Warm oil, slow hands.');
  });

  test('too long for Instagram', () => {
    show(post());
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const rest = postText({ caption: 'x', hashtags: post().hashtags }, CTA).length - 1;
    fireEvent.change(field('Caption'), {
      target: { value: 'a'.repeat(INSTAGRAM_CAPTION_MAX - rest + 10) },
    });
    expect(save().disabled).toBe(true);
    expect(screen.getByText('Too long for Instagram: 10 characters over.')).toBeTruthy();
  });

  test("a blank caption can't be saved", () => {
    show(post());
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(field('Caption'), { target: { value: '  \n ' } });
    expect(save().disabled).toBe(true);
    expect(screen.getByText('Write a caption first.')).toBeTruthy();
  });

  test('the alt text counter', () => {
    show(post({ altText: 'a'.repeat(76) }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByText('76/125')).toBeTruthy();
    expect(field('Image description').maxLength).toBe(125);
    expect(screen.getByText('Up to 5. Separate them with spaces.')).toBeTruthy();
  });

  test('edit is disabled while a run is busy', () => {
    show(post(), { busy: true });
    expect((screen.getByRole('button', { name: 'Edit' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { PostCard } from '@/components/posts/post-card';
import type { Flag, Post } from '@/lib/posts/batch';
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
  opts: {
    onSave?: (edit: PostEdit) => void;
    busy?: boolean;
    withImage?: boolean;
    flags?: Flag[];
  } = {},
) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
      <PostCard
        post={p}
        cta={CTA}
        image={
          opts.withImage ? { state: { kind: 'ready', image }, onNewImage: () => {} } : undefined
        }
        flags={opts.flags}
        onSave={opts.onSave ?? (() => {})}
        busy={opts.busy}
      />
    </NextIntlClientProvider>,
  );
}

const field = (name: string) => screen.getByLabelText(name) as HTMLInputElement;
const save = () => screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;

describe('a suggestion card', () => {
  test("a card shows only what the spec keeps, in the spec's order", () => {
    const { container } = show(post({ edited: true }), { withImage: true });
    const text = container.textContent ?? '';
    const order = [
      'Warm oil, slow hands.',
      CTA,
      '#canggu',
      'Edit the text',
      'Create new image',
      'See the story image',
    ].map((part) => text.indexOf(part));
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(container.querySelector('img')).toBeTruthy();
    for (const gone of ['Offer', 'Post 1', 'Edited', 'Image description', 'Check before posting']) {
      expect(text).not.toContain(gone);
    }
    expect(text).not.toContain(post().altText);
  });

  test('warnings in plain words', () => {
    const { container } = show(post(), {
      flags: [
        { kind: 'price', text: '990k' },
        { kind: 'firstLine', text: 'A long first line' },
      ],
    });
    expect(
      screen.getByText("This price isn't on your website: 990k. Check it before posting."),
    ).toBeTruthy();
    expect(container.textContent).not.toContain('A long first line');
    expect(container.textContent).not.toContain('more');
  });
});

describe('editing a post', () => {
  test('edit and save hands the new words over', () => {
    const onSave = vi.fn();
    show(post(), { onSave });
    fireEvent.click(screen.getByRole('button', { name: 'Edit the text' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Edit the text' }));
    fireEvent.change(field('Caption'), { target: { value: 'Something else.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Warm oil, slow hands.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Edit the text' }));
    expect(field('Caption').value).toBe('Warm oil, slow hands.');
  });

  test('too long for Instagram', () => {
    show(post());
    fireEvent.click(screen.getByRole('button', { name: 'Edit the text' }));
    const rest = postText({ caption: 'x', hashtags: post().hashtags }, CTA).length - 1;
    fireEvent.change(field('Caption'), {
      target: { value: 'a'.repeat(INSTAGRAM_CAPTION_MAX - rest + 10) },
    });
    expect(save().disabled).toBe(true);
    expect(screen.getByText('Too long for Instagram: 10 characters over.')).toBeTruthy();
  });

  test("a blank caption can't be saved", () => {
    show(post());
    fireEvent.click(screen.getByRole('button', { name: 'Edit the text' }));
    fireEvent.change(field('Caption'), { target: { value: '  \n ' } });
    expect(save().disabled).toBe(true);
    expect(screen.getByText('Write a caption first.')).toBeTruthy();
  });

  test('the editor has no image description', () => {
    show(post());
    fireEvent.click(screen.getByRole('button', { name: 'Edit the text' }));
    expect(screen.queryByLabelText('Image description')).toBeNull();
    expect(screen.getByText('Up to 5. Separate them with spaces.')).toBeTruthy();
  });

  test('edit is disabled while a run is busy', () => {
    show(post(), { busy: true });
    expect(
      (screen.getByRole('button', { name: 'Edit the text' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});

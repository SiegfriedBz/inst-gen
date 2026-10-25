// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { copyToClipboard, imageFileName, saveImageFile } from '@/lib/posts/take-away';

afterEach(() => {
  vi.restoreAllMocks();
});

const jpeg = new Blob([new Uint8Array([0xff, 0xd8])], { type: 'image/jpeg' });

describe('file names', () => {
  test('name, batch date, number and kind', () => {
    expect(imageFileName('Sen Da Nang Massage', '2026-10-25T09:00:00.000Z', 2, 'post')).toBe(
      'sen-da-nang-massage-2026-10-25-2-post.jpg',
    );
    expect(imageFileName('Svarga', '2026-10-25T09:00:00.000Z', 6, 'story')).toBe(
      'svarga-2026-10-25-6-story.jpg',
    );
  });

  test('file names fold accents and symbols', () => {
    expect(imageFileName('Sen Đà Nẵng Spa!', '2026-10-25T09:00:00.000Z', 1, 'post')).toBe(
      'sen-da-nang-spa-2026-10-25-1-post.jpg',
    );
    expect(imageFileName('  ***  ', '2026-10-25T09:00:00.000Z', 1, 'post')).toBe(
      'shopfront-2026-10-25-1-post.jpg',
    );
  });
});

describe('the clipboard', () => {
  test('copied text returns true', async () => {
    const writeText = vi.fn(async () => {});
    expect(await copyToClipboard('Warm oil.', { writeText })).toBe(true);
    expect(writeText).toHaveBeenCalledWith('Warm oil.');
  });

  test('a refused clipboard returns false', async () => {
    const writeText = vi.fn(async () => {
      throw new DOMException('denied', 'NotAllowedError');
    });
    expect(await copyToClipboard('Warm oil.', { writeText })).toBe(false);
    expect(await copyToClipboard('Warm oil.', undefined)).toBe(false);
  });
});

describe('saving an image', () => {
  test('saving shares when files can be shared', async () => {
    const share = vi.fn(async () => {});
    const nav = { canShare: () => true, share } as unknown as Navigator;
    expect(await saveImageFile(jpeg, 'a-post.jpg', { navigator: nav, document })).toBe('shared');
    const files = (share.mock.calls[0] as unknown as [{ files: File[] }])[0].files;
    expect(files[0].name).toBe('a-post.jpg');
    expect(files[0].type).toBe('image/jpeg');
  });

  test('a share the owner closes is cancelled', async () => {
    const share = vi.fn(async () => {
      throw new DOMException('closed', 'AbortError');
    });
    const nav = { canShare: () => true, share } as unknown as Navigator;
    expect(await saveImageFile(jpeg, 'a-post.jpg', { navigator: nav, document })).toBe('cancelled');
  });

  test('saving downloads otherwise', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:file');
    URL.revokeObjectURL = vi.fn();
    const clicked: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this.download);
    });
    const nav = {} as Navigator;
    expect(await saveImageFile(jpeg, 'a-post.jpg', { navigator: nav, document })).toBe(
      'downloaded',
    );
    expect(clicked).toEqual(['a-post.jpg']);
  });
});

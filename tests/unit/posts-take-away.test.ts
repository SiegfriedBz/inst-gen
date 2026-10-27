// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { copyToClipboard, imageFileName, saveImageFiles } from '@/lib/posts/take-away';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('file names', () => {
  test('name, day, attempt, suggestion and kind', () => {
    expect(imageFileName('Sen Da Nang Massage', '2026-10-25T09:00:00.000Z', 2, 3, 'post')).toBe(
      'sen-da-nang-massage-2026-10-25-attempt-2-suggestion-3-post.jpg',
    );
    expect(imageFileName('Svarga', '2026-10-25T09:00:00.000Z', 1, 6, 'story')).toBe(
      'svarga-2026-10-25-attempt-1-suggestion-6-story.jpg',
    );
  });

  test('file names fold accents and symbols', () => {
    expect(imageFileName('Sen Đà Nẵng Spa!', '2026-10-25T09:00:00.000Z', 1, 1, 'post')).toBe(
      'sen-da-nang-spa-2026-10-25-attempt-1-suggestion-1-post.jpg',
    );
    expect(imageFileName('  ***  ', '2026-10-25T09:00:00.000Z', 1, 1, 'post')).toBe(
      'shopfront-2026-10-25-attempt-1-suggestion-1-post.jpg',
    );
  });

  test("the date is the day the attempt's reset opened, on the phone", () => {
    const zone = process.env.TZ;
    try {
      process.env.TZ = 'Asia/Ho_Chi_Minh';
      // 00:10 on the 26th in Da Nang: the day that opened at 14:00 on the 25th.
      expect(imageFileName('Sen', '2026-10-25T17:10:00.000Z', 2, 3, 'post')).toBe(
        'sen-2026-10-25-attempt-2-suggestion-3-post.jpg',
      );
      // 06:30 on the 26th in Da Nang: still the 25th's day.
      expect(imageFileName('Sen', '2026-10-25T23:30:00.000Z', 1, 1, 'story')).toBe(
        'sen-2026-10-25-attempt-1-suggestion-1-story.jpg',
      );
      // 14:30 on the 26th in Da Nang: after the reset, the 26th's day.
      expect(imageFileName('Sen', '2026-10-26T07:30:00.000Z', 1, 1, 'post')).toBe(
        'sen-2026-10-26-attempt-1-suggestion-1-post.jpg',
      );
    } finally {
      if (zone === undefined) delete process.env.TZ;
      else process.env.TZ = zone;
    }
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

describe('saving the two images', () => {
  const post = new Blob(['p'], { type: 'image/jpeg' });
  const story = new Blob(['s'], { type: 'image/jpeg' });
  const files = [
    { blob: post, name: 'a-post.jpg' },
    { blob: story, name: 'a-story.jpg' },
  ];
  const iPhone =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
  const iPad =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
  const android =
    'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
  const downloads = () => {
    URL.createObjectURL = vi.fn(() => 'blob:file');
    URL.revokeObjectURL = vi.fn();
    const clicked: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this.download);
    });
    return clicked;
  };

  test('on an iPhone, both images go in one share, post first', async () => {
    const share = vi.fn(async () => {});
    const nav = { userAgent: iPhone, canShare: () => true, share } as unknown as Navigator;
    expect(await saveImageFiles(files, { navigator: nav, document })).toBe('shared');
    expect(share).toHaveBeenCalledTimes(1);
    const shared = (share.mock.calls[0] as unknown as [{ files: File[] }])[0].files;
    expect(shared.map((f) => f.name)).toEqual(['a-post.jpg', 'a-story.jpg']);
    expect(shared.every((f) => f.type === 'image/jpeg')).toBe(true);
  });

  test('a cancelled share is not an error', async () => {
    const share = vi.fn(async () => {
      throw new DOMException('closed', 'AbortError');
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    const nav = { userAgent: iPhone, canShare: () => true, share } as unknown as Navigator;
    expect(await saveImageFiles(files, { navigator: nav, document })).toBe('cancelled');
    expect(click).not.toHaveBeenCalled();
  });

  test('an iPad, which says it is a Mac, shares too', async () => {
    const share = vi.fn(async () => {});
    const nav = {
      userAgent: iPad,
      maxTouchPoints: 5,
      canShare: () => true,
      share,
    } as unknown as Navigator;
    expect(await saveImageFiles(files, { navigator: nav, document })).toBe('shared');
  });

  // Android's share sheet has no "save": the owner's test, 2026-10-27.
  test('on Android, both images download, post first, even where files can be shared', async () => {
    const clicked = downloads();
    const share = vi.fn(async () => {});
    const nav = { userAgent: android, canShare: () => true, share } as unknown as Navigator;
    expect(await saveImageFiles(files, { navigator: nav, document })).toBe('downloaded');
    expect(share).not.toHaveBeenCalled();
    expect(clicked).toEqual(['a-post.jpg', 'a-story.jpg']);
  });

  test('a Mac without touch downloads', async () => {
    const clicked = downloads();
    const nav = {
      userAgent: iPad,
      maxTouchPoints: 0,
      canShare: () => true,
      share: vi.fn(),
    } as unknown as Navigator;
    expect(await saveImageFiles(files, { navigator: nav, document })).toBe('downloaded');
    expect(clicked).toHaveLength(2);
  });

  test('without file sharing both images download', async () => {
    const clicked = downloads();
    expect(
      await saveImageFiles(files, { navigator: { userAgent: iPhone } as Navigator, document }),
    ).toBe('downloaded');
    expect(clicked).toEqual(['a-post.jpg', 'a-story.jpg']);
  });
});

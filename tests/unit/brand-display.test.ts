import { describe, expect, test } from 'vitest';
import { lastReadLabel, sourceOf } from '@/lib/brand/display';

describe('where a fact came from', () => {
  test('a page source shows its path and links to it', () => {
    expect(sourceOf('https://sendanangmassage.com/contact', 'fact')).toEqual({
      kind: 'page',
      path: '/contact',
      href: 'https://sendanangmassage.com/contact',
    });
  });

  test('the home page is named', () => {
    expect(sourceOf('https://sendanangmassage.com/', 'fact')).toEqual({
      kind: 'home',
      href: 'https://sendanangmassage.com/',
    });
  });

  test('a colour source that is not a URL is "from your website"', () => {
    expect(sourceOf('css:--color-bg', 'fact')).toEqual({ kind: 'site' });
    expect(sourceOf('theme-color', 'guess')).toEqual({ kind: 'site' });
  });

  test('model and owner sources', () => {
    expect(sourceOf('model', 'guess')).toEqual({ kind: 'model', as: 'guess' });
    expect(sourceOf('model', 'suggestion')).toEqual({ kind: 'model', as: 'suggestion' });
    expect(sourceOf('model', 'fact')).toEqual({ kind: 'model', as: 'guess' });
    expect(sourceOf('owner', 'fact')).toEqual({ kind: 'owner' });
  });

  test('a source on another host shows as seen on', () => {
    const site = 'https://sendanangmassage.com/';
    expect(sourceOf('https://vietnam.travel/da-nang', 'fact', site)).toEqual({
      kind: 'elsewhere',
      host: 'vietnam.travel',
      href: 'https://vietnam.travel/da-nang',
    });
    expect(sourceOf('https://www.sendanangmassage.com/contact', 'fact', site)?.kind).toBe('page');
    expect(sourceOf('https://vietnam.travel/da-nang', 'fact')?.kind).toBe('page');
  });

  test('no source yet, as in a partial, shows nothing', () => {
    expect(sourceOf(undefined, 'fact')).toBeNull();
    expect(sourceOf('', 'fact')).toBeNull();
  });
});

describe('when the site was last read', () => {
  const now = new Date('2026-10-24T10:00:00Z');

  test('in days', () => {
    expect(lastReadLabel('2026-10-21T10:00:00Z', now, 'en')).toBe('3 days ago');
  });

  test('in hours and minutes, in the screen language', () => {
    expect(lastReadLabel('2026-10-24T07:00:00Z', now, 'en')).toBe('3 hours ago');
    expect(lastReadLabel('2026-10-24T09:30:00Z', now, 'vi')).toBe(
      new Intl.RelativeTimeFormat('vi', { numeric: 'auto' }).format(-30, 'minute'),
    );
  });

  test('just now', () => {
    expect(lastReadLabel('2026-10-24T10:00:00Z', now, 'en')).toBe('this minute');
  });
});

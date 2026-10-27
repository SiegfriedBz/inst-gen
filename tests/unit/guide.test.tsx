// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { GuideLink } from '@/components/guide/guide-links';
import { GUIDE_SECTIONS, OwnerGuide } from '@/components/guide/owner-guide';
import type { Locale } from '@/lib/i18n/locale';
import { messagesFor } from '@/lib/i18n/messages';

afterEach(cleanup);

function show(
  locale: Locale = 'en',
  props: Partial<Parameters<typeof OwnerGuide>[0]> = {},
): HTMLElement {
  const { container } = render(
    <NextIntlClientProvider locale={locale} messages={messagesFor(locale)}>
      <OwnerGuide contact={null} {...props} />
    </NextIntlClientProvider>,
  );
  return container;
}

const LOCALES: Locale[] = ['en', 'id', 'vi'];

describe('the owner guide', () => {
  test.each(LOCALES)('shows the eight sections in order, in %s', (locale) => {
    show(locale);
    const guide = messagesFor(locale).guide;
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(GUIDE_SECTIONS.map((id) => guide[id].title));
  });

  test.each(['en', 'vi'] as Locale[])('the contents link to fixed ids, in %s', (locale) => {
    show(locale);
    const nav = screen.getByRole('navigation', { name: messagesFor(locale).guide.contents });
    const hrefs = [...nav.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(GUIDE_SECTIONS.map((id) => `#${id}`));
    for (const id of GUIDE_SECTIONS) expect(document.getElementById(id)).not.toBeNull();
  });

  test.each(LOCALES)('names buttons as the app does, in %s', (locale) => {
    const text = show(locale).textContent ?? '';
    const m = messagesFor(locale);
    for (const name of [
      m.posts.saveImages,
      m.posts.copyText,
      m.posts.make,
      m.brand.home.read,
      m.reviews.write,
    ]) {
      expect(text).toContain(name);
    }
  });

  test('the numbers come from the limits', () => {
    const changed = show('en', {
      limits: { reads: 3, attempts: 4, newImages: 10, replies: 20 },
    }).textContent;
    expect(changed).toContain('4 attempts');
    cleanup();
    const text = show('en').textContent;
    expect(text).toContain('3 attempts');
    expect(text).toContain('20 replies');
  });

  test('no contact, no contact line', () => {
    const none = show('en', { contact: null });
    expect(none.querySelector('#trouble a[href^="https://wa.me/"]')).toBeNull();
    cleanup();
    const some = show('en', { contact: '+84 90 123 4567' });
    const link = some.querySelector('#trouble a[href^="https://wa.me/"]');
    expect(link?.getAttribute('href')).toBe('https://wa.me/84901234567');
    expect(link?.textContent).toBe('+84 90 123 4567');
  });

  test('the print button prints', () => {
    const print = vi.fn();
    window.print = print;
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Print or save as PDF' }));
    expect(print).toHaveBeenCalledTimes(1);
  });
});

describe('the Guide link', () => {
  test('is an icon named "Guide"', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messagesFor('en')}>
        <GuideLink />
      </NextIntlClientProvider>,
    );
    const link = screen.getByRole('link', { name: 'Guide' });
    expect(link.getAttribute('href')).toBe('/guide');
    expect(link.textContent).toBe('');
    expect(link.getAttribute('title')).toBe('Guide');
  });
});

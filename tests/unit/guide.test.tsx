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
  test.each(LOCALES)('shows the nine sections in order, in %s', (locale) => {
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
      m.posts.newTexts,
      m.reviews.write,
      m.questions.write,
      m.questions.final,
      m.questions.next,
      m.questions.newConversation,
      m.home.tabs.questions,
      m.questions.again,
      m.posts.rewriteOne,
      m.brand.home.read,
    ]) {
      expect(text).toContain(name);
    }
  });

  // The reading screen says about 20 seconds; the guide said a minute
  // (docs/specs/guide/owner-guide, changed 2026-11-13).
  test.each(LOCALES)("gives the website read the reading screen's time, in %s", (locale) => {
    const read = show(locale).querySelector('#business li')?.textContent ?? '';
    const seconds = messagesFor(locale).brand.home.keepOpen.match(/\d+/)?.[0];
    expect(seconds).toBeTruthy();
    expect(read).toContain(seconds);
  });

  // The tab's own hint (docs/specs/platform/easier-to-use, "The Questions hint").
  test.each(LOCALES)("asks to take out the guest's name, as the tab does, in %s", (locale) => {
    const hint = messagesFor(locale).questions.hint.replace(/\.$/, '').toLowerCase();
    const questions = show(locale).querySelector('#questions')?.textContent ?? '';
    expect(questions.toLowerCase()).toContain(hint);
  });

  // docs/specs/questions/answer-drafts, "The owner guide"; before the reviews,
  // as in the bar (docs/specs/platform/easier-to-use).
  test.each(LOCALES)('explains the Questions tab before the reviews, in %s', (locale) => {
    show(locale);
    const order = [...document.querySelectorAll('section[id]')].map((section) => section.id);
    expect(order.indexOf('reviews')).toBe(order.indexOf('questions') + 1);
    const questions = document.getElementById('questions')?.textContent ?? '';
    const m = messagesFor(locale).guide.questions;
    expect(questions).toContain(m.sex);
    expect(questions).toContain(m.send);
  });

  // The story text (docs/specs/posts/story-text, "The owner guide").
  test.each(LOCALES)(
    'names the three buttons without numbers, and the story text, in %s',
    (locale) => {
      const m = messagesFor(locale);
      const instagram = show(locale).querySelector('#instagram');
      const bold = [...(instagram?.querySelectorAll('b') ?? [])].map((b) => b.textContent);
      expect(bold).toEqual(
        expect.arrayContaining([m.posts.saveImages, m.posts.copyText, m.posts.copyStory]),
      );
      expect(bold.some((b) => /^[12] /.test(b ?? ''))).toBe(false);
      expect(instagram?.textContent).not.toContain('A story has no text to paste');
    },
  );

  test.each(LOCALES)("explains the offer with the app's own words, in %s", (locale) => {
    const m = messagesFor(locale);
    const posts = show(locale).querySelector('#posts');
    const text = posts?.textContent ?? '';
    for (const name of [
      m.posts.offer.add,
      m.posts.offer.done,
      m.posts.offer.badgeFree,
      m.posts.checkText,
    ]) {
      expect(text).toContain(name);
    }
    // The everyday steps first, the offer's four steps last.
    const lists = posts?.querySelectorAll('ol') ?? [];
    expect(lists).toHaveLength(1);
    expect(lists[0].querySelectorAll('li')).toHaveLength(4);
    expect(posts?.lastElementChild?.textContent).toContain('✕');
  });

  test.each(LOCALES)('your business is three numbered steps, in %s', (locale) => {
    const steps = show(locale).querySelectorAll('#business ol li');
    expect(steps).toHaveLength(3);
    // The read starts by itself (docs/specs/platform/easier-to-use).
    expect(steps[0].textContent).toBe(messagesFor(locale).guide.business.read);
  });

  test.each([
    ['en', 'EN'],
    ['id', 'ID'],
    ['vi', 'VI'],
  ] as [Locale, string][])(
    'names the language button by the code it shows, in %s',
    (locale, code) => {
      const languages = show(locale).querySelector('#languages')?.textContent ?? '';
      expect(languages).toContain(code);
      if (code !== 'EN') expect(languages).not.toContain('EN');
    },
  );

  test('says the offer stays through the reset', () => {
    const allowance = show('en').querySelector('#allowance')?.textContent ?? '';
    expect(allowance).toContain('Your special offer stays');
  });

  test('the numbers come from the limits', () => {
    const changed = show('en', {
      limits: { reads: 3, attempts: 4, newImages: 10, replies: 20, answers: 20, newTexts: 10 },
    }).textContent;
    expect(changed).toContain('4 attempts');
    cleanup();
    const text = show('en').textContent;
    expect(text).toContain('3 attempts');
    expect(text).toContain('20 replies');
    expect(text).toContain('20 answers');
    expect(text).toContain('10 new texts');
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

describe('the guide follows the friendlier home', () => {
  test('it names the new controls', () => {
    show('en');
    expect(screen.getByText(/Tap a suggestion to open it/)).toBeTruthy();
    expect(screen.getByText(/button at the top right changes the language/)).toBeTruthy();
    expect(screen.getByText(/Switch between/)).toBeTruthy();
    expect(screen.getByText(/Shopfront lists what it couldn't find/)).toBeTruthy();
    expect(screen.getByText(/The line at the top of each tab/)).toBeTruthy();
    expect(document.body.textContent).toContain('Saved and copied');
    expect(document.body.textContent).not.toContain('EN, VI, ID');
  });
});

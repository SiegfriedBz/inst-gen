import { describe, expect, test } from 'vitest';
import { choosePages, englishHome, otherLanguagePrefixes } from '@/lib/brand/pages';

const HOME = new URL('https://x.com/');
const page = (links: string, head = '') => `<html><head>${head}</head><body>${links}</body></html>`;
const paths = (urls: URL[]) => urls.map((u) => u.pathname);

describe('choosePages', () => {
  test('a link matching 2 words ranks first, then page order', () => {
    const html = page(
      '<a href="/about-us">A</a><a href="/our-services">S</a><a href="/services-and-prices">P</a>',
    );
    expect(paths(choosePages(html, HOME))).toEqual([
      '/services-and-prices',
      '/about-us',
      '/our-services',
    ]);
  });

  test('matches on link text', () => {
    expect(paths(choosePages(page('<a href="/t">Our Treatments</a>'), HOME))).toEqual(['/t']);
  });

  test('drops other hosts, mailto and fragments', () => {
    const html = page(
      '<a href="https://y.com/about">Y</a><a href="mailto:a@x.com">Contact</a><a href="#top">About</a><a href="/contact">C</a>',
    );
    expect(paths(choosePages(html, HOME))).toEqual(['/contact']);
  });

  test('keeps www and bare host as the same site', () => {
    const html = page('<a href="https://www.x.com/about">A</a>');
    expect(paths(choosePages(html, HOME))).toEqual(['/about']);
  });

  test('counts /about and /about/?ref=nav once', () => {
    const html = page('<a href="/about">A</a><a href="/about/?ref=nav">A</a>');
    expect(choosePages(html, HOME)).toHaveLength(1);
  });

  test('ignores links that match no word, and the home page itself', () => {
    const html = page('<a href="/blog/2024">Blog</a><a href="/">Home</a>');
    expect(choosePages(html, HOME)).toEqual([]);
  });

  test('returns at most 7', () => {
    const words = [
      'about',
      'team',
      'menu',
      'prices',
      'packages',
      'booking',
      'contact',
      'faq',
      'location',
    ];
    const html = page(words.map((w) => `<a href="/${w}">${w}</a>`).join(''));
    expect(choosePages(html, HOME)).toHaveLength(7);
  });

  test('ties go to the shorter path', () => {
    const html = page('<a href="/about-our-story-here">A</a><a href="/our-story">B</a>');
    // "about" and "story" (2 words) beat "story" alone, whatever the length.
    expect(paths(choosePages(html, HOME))[0]).toBe('/about-our-story-here');
    const tie = page('<a href="/the-faq-page">A</a><a href="/faq">B</a>');
    expect(paths(choosePages(tie, HOME))).toEqual(['/faq', '/the-faq-page']);
  });

  test('skips links under another language prefix', () => {
    const head =
      '<link rel="alternate" hreflang="en" href="https://x.com/"><link rel="alternate" hreflang="ko" href="https://x.com/ko/">';
    const html = page('<a href="/ko/about">KO</a><a href="/about">EN</a>', head);
    expect(paths(choosePages(html, HOME))).toEqual(['/about']);
  });
});

describe('englishHome', () => {
  test('picks hreflang en-US when it differs from the page read', () => {
    const head =
      '<link rel="alternate" hreflang="x-default" href="https://x.com/ko/"><link rel="alternate" hreflang="en-US" href="https://x.com/en/"><link rel="alternate" hreflang="ko" href="https://x.com/ko/">';
    expect(englishHome(page('', head), new URL('https://x.com/ko/'))?.href).toBe(
      'https://x.com/en/',
    );
  });

  test('is null when the page read is already English', () => {
    const head = '<link rel="alternate" hreflang="en" href="https://x.com/">';
    expect(englishHome(page('', head), HOME)).toBeNull();
  });

  test('is null without alternates', () => {
    expect(englishHome(page(''), HOME)).toBeNull();
  });

  test('ignores an alternate on another site', () => {
    const head = '<link rel="alternate" hreflang="en" href="https://evil.example/">';
    expect(englishHome(page('', head), HOME)).toBeNull();
  });
});

describe('otherLanguagePrefixes', () => {
  test('lists the non-English path prefixes', () => {
    const head =
      '<link rel="alternate" hreflang="en" href="https://x.com/"><link rel="alternate" hreflang="ko" href="https://x.com/ko/"><link rel="alternate" hreflang="zh-CN" href="https://x.com/zh/">';
    expect(otherLanguagePrefixes(page('', head), HOME)).toEqual(['/ko/', '/zh/']);
  });
});

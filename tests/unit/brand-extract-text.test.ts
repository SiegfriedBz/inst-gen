import { describe, expect, test } from 'vitest';
import { shareTextBudget, visibleText } from '@/lib/brand/extract/text';

describe('visibleText', () => {
  test('keeps the main text and drops nav, footer, scripts and cookie banners', () => {
    const html = `<html><head><title>T</title><style>p{}</style></head><body>
      <nav>Home About</nav>
      <div id="cookie-banner">We use cookies</div>
      <main><h1>Svarga</h1>
        <p>Massage   at your
        villa.</p></main>
      <script>var x = 1;</script>
      <footer>© 2026</footer>
    </body></html>`;
    expect(visibleText(html)).toBe('Svarga Massage at your villa.');
  });

  test('a cookie class on html, body or main does not remove the page', () => {
    const html = `<html class="no-js supports-no-cookies"><body class="cookies-not-set">
      <main class="has-cookie-bar"><p>Coffee from 7am</p></main>
      <div class="cookie-notice">Accept cookies</div></body></html>`;
    expect(visibleText(html)).toBe('Coffee from 7am');
  });

  test('keeps text outside main when there is no main', () => {
    expect(visibleText('<body><div><p>Open every day</p></div></body>')).toBe('Open every day');
  });
});

describe('shareTextBudget', () => {
  const page = (url: string, length: number) => ({ url, text: 'x'.repeat(length) });

  test('three long pages share the budget evenly', () => {
    const shared = shareTextBudget([page('a', 50_000), page('b', 50_000), page('c', 50_000)]);
    expect(shared.map((p) => p.text.length)).toEqual([20_000, 20_000, 20_000]);
  });

  test('a short page passes its unused share on', () => {
    const shared = shareTextBudget([page('a', 1_000), page('b', 50_000), page('c', 50_000)]);
    expect(shared.map((p) => p.text.length)).toEqual([1_000, 29_500, 29_500]);
  });

  test('keeps page order and the default of 60,000 characters', () => {
    const shared = shareTextBudget([page('home', 70_000)]);
    expect(shared).toEqual([{ url: 'home', text: 'x'.repeat(60_000) }]);
  });
});

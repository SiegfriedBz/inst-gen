import { describe, expect, test } from 'vitest';
import { robotsAllows } from '@/lib/brand/robots';

const ROBOTS = 'https://x.com/robots.txt';

describe('robotsAllows', () => {
  test('Disallow / for * blocks the home page', () => {
    const allows = robotsAllows('User-agent: *\nDisallow: /\n', ROBOTS);
    expect(allows('https://x.com/')).toBe(false);
  });

  test('a missing robots.txt allows everything', () => {
    expect(robotsAllows(null, ROBOTS)('https://x.com/anything')).toBe(true);
  });

  test('the ShopfrontBot group beats *', () => {
    const txt = 'User-agent: *\nDisallow: /\n\nUser-agent: ShopfrontBot\nDisallow: /private\n';
    const allows = robotsAllows(txt, ROBOTS);
    expect(allows('https://x.com/')).toBe(true);
    expect(allows('https://x.com/private/page')).toBe(false);
  });

  test('other disallowed pages are refused, the rest allowed', () => {
    const allows = robotsAllows('User-agent: *\nDisallow: /admin\n', ROBOTS);
    expect(allows('https://x.com/admin/login')).toBe(false);
    expect(allows('https://x.com/about')).toBe(true);
  });
});

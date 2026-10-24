import robotsParser from 'robots-parser';
import { USER_AGENT } from './fetch-safe';

const AGENT = USER_AGENT.split('/')[0];

// The rules for ShopfrontBot apply, or else those for `*`. A missing or
// unreadable robots.txt allows everything.
export function robotsAllows(
  robotsTxt: string | null,
  robotsUrl: string,
): (url: string) => boolean {
  if (robotsTxt === null) return () => true;
  const robots = robotsParser(robotsUrl, robotsTxt);
  return (url) => robots.isAllowed(url, AGENT) !== false;
}

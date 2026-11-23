// The opening hours in words, a night post's fact for a business that comes
// to its guests (docs/specs/posts/reasons-to-book, "The fact, dealt by
// code", amended 2026-11-23): "Open every day until 11 pm". Only hours open
// every day with one closing time are read; anything else gives null, and
// the night post draws a highlight instead.

const DAY_NAMES: readonly (readonly string[])[] = [
  ['mo', 'mon', 'monday'],
  ['tu', 'tue', 'tues', 'tuesday'],
  ['we', 'wed', 'wednesday'],
  ['th', 'thu', 'thur', 'thurs', 'thursday'],
  ['fr', 'fri', 'friday'],
  ['sa', 'sat', 'saturday'],
  ['su', 'sun', 'sunday'],
];
const WEEK = [0, 1, 2, 3, 4, 5, 6];
const DASH = new Set(['-', '–', '—', 'to']);
// The only other words hours may hold. Any other word ("off", "except",
// "closed", "tutup", "we're", "24th") leaves them unread: it may skip a day
// (the review of 2026-11-23).
const FILLERS = new Set([
  'open',
  'opening',
  'hours',
  'hour',
  'daily',
  'every',
  'everyday',
  'day',
  'days',
  'a',
  'week',
  'from',
  'and',
  '7',
]);

// A time as schema.org or a person writes it: "08:30", "10:00:00", "9am",
// "10:30 PM", "midnight", "noon"; never part of a longer number.
const TIME = String.raw`(?<![\d:.])(?:\d{1,2}(?:[:.]\d{2}(?::\d{2})?)?\s*[ap]\.?m\.?|\d{1,2}[:.]\d{2}(?::\d{2})?|midnight|noon)(?!\d)`;
const RANGE = new RegExp(`(${TIME})\\s*(?:-|–|—|to)\\s*(${TIME})`, 'gi');

const DAY = 24 * 60;

function minutesOf(time: string): number | null {
  const t = time.toLowerCase().replace(/\s+/g, '');
  if (t === 'midnight') return DAY;
  if (t === 'noon') return 12 * 60;
  const m = t.match(/^(\d{1,2})(?:[:.](\d{2})(?::\d{2})?)?(?:([ap])\.?m\.?)?$/);
  if (!m) return null;
  let hour = Number(m[1]);
  const minutes = Number(m[2] ?? 0);
  if (minutes > 59) return null;
  if (m[3]) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (m[3] === 'p' ? 12 : 0);
  } else if (hour > 24 || (hour === 24 && minutes > 0)) {
    return null;
  }
  return hour * 60 + minutes;
}

// The days a text names: ranges ("Mo-Su", "Monday to Sunday", wrapping
// round the week), lists ("Mo,Tu") or, with no day named, every day
// ("daily"). Null for a word that is neither a day nor a filler.
function daysIn(text: string): Set<number> | null {
  const tokens = text.toLowerCase().match(/[\p{L}\p{N}']+|[-–—]/gu) ?? [];
  const index = (token: string | undefined) =>
    token ? DAY_NAMES.findIndex((names) => names.includes(token)) : -1;
  const days = new Set<number>();
  let everyDay = false;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const from = index(token);
    if (from >= 0) {
      const to = DASH.has(tokens[i + 1]) ? index(tokens[i + 2]) : -1;
      if (to < 0) {
        days.add(from);
        continue;
      }
      for (let d = from; ; d = (d + 1) % 7) {
        days.add(d);
        if (d === to) break;
      }
      i += 2;
      continue;
    }
    if (DASH.has(token)) continue;
    if (!FILLERS.has(token)) return null;
    const next = tokens[i + 1];
    if (
      token === 'daily' ||
      token === 'everyday' ||
      (token === 'every' && next === 'day') ||
      (token === '7' && next === 'days')
    ) {
      everyDay = true;
    }
  }
  return days.size === 0 && everyDay ? new Set(WEEK) : days;
}

function closingWords(close: number): string {
  const time = close % DAY;
  if (time === 0 || time === DAY - 1) return 'midnight';
  if (time === 12 * 60) return 'noon';
  const hour = Math.floor(time / 60);
  const minutes = time % 60;
  const clock = `${hour % 12 || 12}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''}`;
  return `${clock} ${hour < 12 ? 'am' : 'pm'}`;
}

const ROUND_THE_CLOCK = 'round the clock';

export function hoursInWords(hours: string): string | null {
  const ranges = [...hours.matchAll(RANGE)];
  if (ranges.length === 0) return null;
  let words: string | null = null;
  for (const [, opens, closes] of ranges) {
    const open = minutesOf(opens);
    const close = minutesOf(closes);
    if (open === null || close === null) return null;
    const these =
      open % DAY === 0 && (close % DAY === 0 || close === DAY - 1)
        ? ROUND_THE_CLOCK
        : closingWords(close);
    if (words !== null && these !== words) return null;
    words = these;
  }
  // Every day closes at the same time, so the days need only cover the week.
  const days = daysIn(hours.replace(RANGE, ' '));
  if (!days || days.size < 7) return null;
  return words === ROUND_THE_CLOCK ? 'Open 24 hours, every day' : `Open every day until ${words}`;
}

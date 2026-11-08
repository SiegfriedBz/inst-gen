import { countryOf } from '@/lib/brand/country';
import type { Profile } from '@/lib/brand/profile';
import { BALI_PLACES } from './setup';

// A hashtag that names a town or area of another country than the
// business's goes (docs/specs/posts/marketing-copy, "Hashtags"): the main
// tourist places of the pilot's two countries, Bali's from 2.12. A name under
// 4 letters (Hue) is left out, since it hides inside other words.
const VIETNAM = [
  'Da Nang',
  'Hoi An',
  'Nha Trang',
  'Ho Chi Minh',
  'Saigon',
  'Hanoi',
  'Ha Long',
  'Phu Quoc',
  'Da Lat',
  'Mui Ne',
  'Sapa',
  'Quy Nhon',
  'Vung Tau',
  'Ninh Binh',
  'My Khe',
  'Son Tra',
];
const INDONESIA = [
  ...BALI_PLACES,
  'Jakarta',
  'Lombok',
  'Gili',
  'Nusa Penida',
  'Yogyakarta',
  'Labuan Bajo',
];
const FOREIGN = { VN: INDONESIA, ID: VIETNAM } as const;

// Lower case, accents gone ("đ" as "d"), letters and digits only: "Đà Nẵng"
// and "danang" are the same.
function compact(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function dropForeignTags(
  tags: string[],
  profile: Profile,
): { tags: string[]; dropped: { tag: string; place: string }[] } {
  const country = countryOf(profile);
  if (!country) return { tags, dropped: [] };
  const places = FOREIGN[country]
    .map((place) => ({ place, key: compact(place) }))
    .filter(({ key }) => key.length >= 4);
  const offerings = profile.offerings.map((o) => compact(o.name)).filter(Boolean);
  const kept: string[] = [];
  const dropped: { tag: string; place: string }[] = [];
  for (const tag of tags) {
    // The business's own offerings are cut out first: "balinesemassage"
    // names no place on a spa in Da Nang that offers it.
    const rest = offerings.reduce((text, name) => text.split(name).join(' '), compact(tag));
    const found = places.find(({ key }) => rest.includes(key));
    if (found) dropped.push({ tag, place: found.place });
    else kept.push(tag);
  }
  return { tags: kept, dropped };
}

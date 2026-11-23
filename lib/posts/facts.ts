import type { Profile } from '@/lib/brand/profile';
import { type PostsModelInput, postsModelInput } from './input';
import { type Light, pick, type Setup } from './setup';
import { folded, holdsWords } from './variety';

// The fact that ends each caption of a business that comes to its guests,
// dealt by code so it removes a doubt (docs/specs/posts/reasons-to-book, "The
// fact, dealt by code").

// Words of a highlight that turns a request away ("Professional therapeutic
// massage only"): on the website it does its job; in a post it raises the
// doubt it answers. The list may grow.
const TURNS_AWAY = [
  'only',
  'strictly',
  'sexual',
  'sex',
  'erotic',
  'extra service',
  'extra services',
  'happy ending',
];

// A short highlight that names the guest's place says what the answer says
// ("Massage at your villa or hotel").
const WHERE = ['your villa', 'your hotel', 'your room', 'your apartment', 'your home'];
const WHERE_WORDS = 6;

export function turnsAway(text: string): boolean {
  const plain = folded(text);
  return TURNS_AWAY.some((words) => holdsWords(plain, words));
}

export function onlySaysWhere(text: string): boolean {
  const plain = folded(text);
  const words = plain.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
  return words <= WHERE_WORDS && WHERE.some((where) => holdsWords(plain, where));
}

// The highlights code may deal, each once, in the profile's order.
export function factsOf(profile: Profile): string[] {
  const facts: string[] = [];
  for (const { value } of profile.highlights) {
    const fact = value.trim();
    if (fact && !turnsAway(fact) && !onlySaysWhere(fact) && !facts.includes(fact)) {
      facts.push(fact);
    }
  }
  return facts;
}

// The opening hours, a night post's fact: the business comes late.
export function hoursFact(profile: Profile): string | null {
  const hours = profile.hours?.value.trim();
  return hours ? `Hours: ${hours}` : null;
}

function factsFor(profile: Profile, light: Light): string[] {
  const hours = light === 'night' ? hoursFact(profile) : null;
  return hours ? [...factsOf(profile), hours] : factsOf(profile);
}

// A fact for a post of this light, none of those to avoid, or none at all.
export function pickFact(
  profile: Profile,
  light: Light,
  avoid: readonly (string | undefined)[],
  random: () => number,
): string | undefined {
  const left = factsFor(profile, light).filter((fact) => !avoid.includes(fact));
  return left.length ? pick(left, random) : undefined;
}

// Each set-up in order gets a fact the ones before it don't have, or none.
export function dealFacts(profile: Profile, setups: Setup[], random: () => number): Setup[] {
  const dealt: string[] = [];
  return setups.map(({ fact: _, ...setup }) => {
    const fact = pickFact(profile, setup.light ?? 'day', dealt, random);
    if (!fact) return setup;
    dealt.push(fact);
    return { ...setup, fact };
  });
}

// New words, a new fact: neither the post's own nor the other post's while
// another is left; then only not the other's; then any.
export function newFact(
  profile: Profile,
  setup: Setup,
  other: Setup | undefined,
  random: () => number,
): string | undefined {
  const light = setup.light ?? 'day';
  return (
    pickFact(profile, light, [setup.fact, other?.fact], random) ??
    pickFact(profile, light, [other?.fact], random) ??
    pickFact(profile, light, [], random)
  );
}

// A post's fact, while the profile still gives it for the post's light.
export function keptFact(profile: Profile, setup: Setup): string | undefined {
  const { fact } = setup;
  return fact && factsFor(profile, setup.light ?? 'day').includes(fact) ? fact : undefined;
}

// What a business that comes to its guests sends the posts' model: never a
// highlight that turns a request away. The profile's hash stays on
// postsModelInput, so no saved post goes out of date for it. (Here rather
// than in input.ts, which setup.ts imports: no import cycle.)
export function postsPromptInput(profile: Profile): PostsModelInput {
  const input = postsModelInput(profile);
  return { ...input, highlights: input.highlights.filter((h) => !turnsAway(h.value)) };
}

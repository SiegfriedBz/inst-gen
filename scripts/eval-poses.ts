// Makes one image per treatment look a fixture's offerings give, with the
// real image model, to check the poses of docs/specs/posts/normal-bodies:
// normal bodies, a professional massage, clothes as today, the spa's look,
// two therapists only for four hands and couples. Thai gets two: a leg
// stretch and a palm press. Each image prompt is written as the post plan
// writes one from its set-up line, adding no word about linens or colours
// (Sen's recorded Thai prompt has none); no text call is made. Story JPEGs go
// under .superpowers/eval-poses/<slug>/, outside git.
// ⚠️ It spends about $0.05 of the prepaid image balance per image (11 for
// Sen and Svarga). A slug is required, so it never spends by accident;
// --dry prints the prompts and spends nothing.
//
// Usage: pnpm eval:poses <slug…> [--dry]
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { geminiImageModel, IMAGE_MODEL, IMAGE_USD } from '@/lib/ai/image-model';
import { CACHE_DIR, FIXTURES_DIR, fixtureProfile } from '@/lib/brand/fixtures';
import type { ImageLog } from '@/lib/posts/image-log';
import { IMAGE_PROMPT_VERSION, imagePrompt } from '@/lib/posts/image-prompt';
import { makePostImage } from '@/lib/posts/image-run';
import type { Scene } from '@/lib/posts/scene';
import {
  type BodyPart,
  type LookKey,
  localsOf,
  lookOf,
  type Setup,
  setupLine,
} from '@/lib/posts/setup';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const dry = process.argv.includes('--dry');
const slugs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (slugs.length === 0) {
  console.error('Usage: pnpm eval:poses <slug…> [--dry] (about $0.05 an image)');
  process.exit(1);
}
const apiKey = process.env.GOOGLE_IMAGE_API_KEY;
if (!dry && !apiKey) {
  console.error('GOOGLE_IMAGE_API_KEY is not set (.env.local)');
  process.exit(1);
}
const OUT = join('.superpowers', 'eval-poses');

// The part each look shows here: its fixed part, the back otherwise; Thai
// both of its parts.
const PARTS: Record<LookKey, BodyPart[]> = {
  plain: ['back'],
  fourHands: ['back'],
  couple: ['back'],
  thai: ['legs', 'back'],
  foot: ['feet'],
  stone: ['back'],
  head: ['head'],
  scrub: ['back'],
  pregnancy: ['back'],
};
const CAMERAS: Record<Scene, string> = {
  treatment: 'seen from the side',
  detail: 'a close view of the hands on the body',
  place: 'the room with the treatment in it',
  guest: 'seen from above',
};
const SCENE_ORDER: Scene[] = ['treatment', 'guest', 'place', 'detail'];

// One set-up per look, in the order the offerings first give it; the
// scenes and lights take turns, guests a woman then a man, a couple never
// the close-up.
function setups(slug: string, offerings: string[], locals: Setup['locals']): Setup[] {
  const firsts = new Map<LookKey, string>();
  for (const name of offerings) {
    const look = lookOf(name);
    if (look !== 'excluded' && !firsts.has(look)) firsts.set(look, name);
  }
  const out: Setup[] = [];
  for (const [look, treatment] of firsts) {
    for (const bodyPart of PARTS[look]) {
      const i = out.length;
      const scene = SCENE_ORDER[i % SCENE_ORDER.length];
      out.push({
        treatment,
        look,
        guests:
          look === 'couple' ? 'couple' : look === 'pregnancy' || i % 2 === 0 ? 'woman' : 'man',
        therapists: look === 'fourHands' || look === 'couple' ? 2 : 1,
        bodyPart,
        scene: look === 'couple' && scene === 'detail' ? 'place' : scene,
        locals,
        light: i % 2 === 0 ? 'day' : 'night',
      });
    }
  }
  if (out.length === 0) throw new Error(`${slug}: no treatment with a look`);
  return out;
}

// The image prompt as the plan writes it from the set-up line: the photo
// itself, never the word "scene".
function postPrompt(setup: Setup): string {
  const [body] = setupLine(setup).split('; scene ');
  const light =
    setup.light === 'night'
      ? 'Evening: lamps and candles give the room a warm glow, the garden outside lit by lanterns'
      : 'Late afternoon: the lamps lit inside, the garden outside in soft shade';
  return `A tall 9:16 photo, ${CAMERAS[setup.scene]}, of ${body}. ${light}. No text or logos.`;
}

const model = apiKey ? geminiImageModel(apiKey) : null;
let spent = 0;
for (const slug of slugs) {
  try {
    const dir = join(FIXTURES_DIR, slug);
    // With the cached photos, so the therapists' look the read saw is kept.
    const cache = join(CACHE_DIR, slug);
    const profile = await fixtureProfile(dir, { imageCache: cache });
    const staffLook = profile.staffLook?.value;
    if (!staffLook) {
      console.log(`${slug}: no therapists' look (photo cache ${cache} missing?)`);
    }
    const list = setups(
      slug,
      profile.offerings.map((o) => o.name),
      localsOf(profile),
    );
    const outDir = join(OUT, slug);
    if (!dry) mkdirSync(outDir, { recursive: true });
    console.log(`\n${slug} · ${list.length} images · look: ${staffLook ?? 'none'}`);
    for (let i = 0; i < list.length; i += 3) {
      await Promise.all(
        list.slice(i, i + 3).map(async (setup, k) => {
          const n = i + k + 1;
          const name = `${n}-${setup.look}-${setup.bodyPart.replaceAll(' ', '-')}`;
          const prompt = postPrompt(setup);
          const head = `  ${name} · ${setup.scene} · ${setup.light} · ${setup.guests}`;
          if (dry || !model) {
            console.log(`${head}\n    ${imagePrompt(prompt, undefined, setup, staffLook)}`);
            return;
          }
          const logs: ImageLog[] = [];
          const out = await makePostImage(
            {
              postId: name,
              imagePrompt: prompt,
              scene: setup.scene,
              first: true,
              setup,
              ...(staffLook ? { staffLook } : {}),
            },
            'eval',
            { model, log: (entry) => logs.push(entry) },
            new AbortController().signal,
          );
          spent += logs[0]?.usd ?? 0;
          if (out.ok) {
            writeFileSync(join(outDir, `${name}.jpg`), Buffer.from(out.response.story, 'base64'));
          }
          console.log(`${head} · ${logs[0]?.modelMs ?? '-'} ms · ${out.ok ? 'ok' : out.code}`);
        }),
      );
    }
  } catch (error) {
    console.log(
      `${slug.padEnd(24)}ERROR ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

console.log(
  `\nposes eval: ${slugs.length} fixture(s) · prompt ${IMAGE_PROMPT_VERSION} · model ${IMAGE_MODEL} · ${dry ? 'dry run, nothing spent' : `about $${spent.toFixed(2)} spent ($${IMAGE_USD} an image)`}`,
);

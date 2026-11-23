import { describe, expect, it } from 'vitest';
import { postsModelInput } from '@/lib/posts/input';
import {
  ALT_RULES,
  HASHTAG_RULES,
  IMAGE_RULES,
  newTextsUserText,
  offerRules,
  planUserText,
  rewriteUserText,
} from '@/lib/posts/prompt';
import {
  REASONS_PROMPT_VERSION,
  reasonsNewTextsPrompt,
  reasonsPlanPrompt,
  reasonsRewritePrompt,
} from '@/lib/posts/reasons-prompt';
import { SAMPLES, samplesText } from '@/lib/posts/samples';
import { peopleOf } from '@/lib/posts/setup';
import { svargaProfile } from './helpers/brand';
import { post, setupAt } from './helpers/posts';

// The posts-20 prompt for a business that comes to its guests
// (docs/specs/posts/reasons-to-book, "What the model gets").

const REASON_LINES = ['- dayOut:', '- stayIn:', '- twoOfYou:', '- firstNight:', '- laptop:'];

describe('reasonsPlanPrompt', () => {
  const prompt = reasonsPlanPrompt(false, true);

  // posts-20: docs/specs/posts/normal-bodies took posts-19 first.
  it('is posts-20', () => {
    expect(REASONS_PROMPT_VERSION).toBe('posts-20');
  });

  it('opens on what a post is for, before any rule', () => {
    expect(prompt.startsWith('Who reads these posts:')).toBe(true);
    expect(prompt.indexOf('the guest never leaves their room')).toBeLessThan(
      prompt.indexOf('Captions:'),
    );
  });

  it('gives the five reasons, the samples and the rules that stay', () => {
    for (const line of REASON_LINES) expect(prompt).toContain(line);
    for (const part of [samplesText(), IMAGE_RULES, HASHTAG_RULES, ALT_RULES]) {
      expect(prompt).toContain(part);
    }
    expect(prompt).toContain('Never in the first person');
    expect(prompt).toContain('names only a mood');
    expect(prompt).toContain('Post 1 is an offer post and post 2 a moment post.');
    expect(prompt).toContain('under "### Facts"');
  });

  it("drops the type jobs, the kinds of question and 2.18's feeling rule", () => {
    for (const gone of [
      '- tip:',
      '- ritual:',
      '- sore:',
      '- ask:',
      'Never a question about how the guest feels',
      'Never reuse a phrase from these instructions',
    ]) {
      expect(prompt).not.toContain(gone);
    }
  });

  it('with an offer, both posts carry it', () => {
    const offered = reasonsPlanPrompt(true, true);
    expect(offered).toContain('Posts 1 and 2 are both offer posts.');
    expect(offered).toContain(offerRules(true));
  });
});

describe('reasonsRewritePrompt and reasonsNewTextsPrompt', () => {
  for (const [name, prompt] of [
    ['rewrite', reasonsRewritePrompt(false, true)],
    ['new texts', reasonsNewTextsPrompt(false, true)],
  ] as const) {
    it(`the ${name} prompt reads each post's reason and fact`, () => {
      for (const line of REASON_LINES) expect(prompt).toContain(line);
      expect(prompt).toContain(samplesText());
      expect(prompt).toContain('its "light"');
      expect(prompt).toContain('its "fact"');
      expect(prompt).toContain('A post without a "reason" takes stayIn.');
    });
  }

  it('neither asks the model to keep a type or a topic: the reason decides', () => {
    expect(reasonsRewritePrompt(false, true)).toContain(
      "Keep each post's scene and image prompt: they don't change.",
    );
    expect(reasonsNewTextsPrompt(false, true)).toContain(
      "Keep its scene, light and image prompt: they don't change.",
    );
    expect(reasonsRewritePrompt(false, true)).not.toContain('type, topic');
    expect(reasonsNewTextsPrompt(false, true)).not.toContain('type, topic');
  });

  it('new texts ask a different question for the same reason', () => {
    expect(reasonsNewTextsPrompt(false, true)).toContain('a different question for its reason');
  });
});

describe('the user texts', () => {
  const input = postsModelInput(svargaProfile());
  const fact = 'No upfront deposit required';
  const laptop = setupAt('night', { reason: 'laptop', fact });
  const stayIn = setupAt('day', { reason: 'stayIn' });

  it('the plan lists each reason, then each fact, after the image set-ups', () => {
    const text = planUserText(input, [], undefined, [laptop, stayIn]);
    expect(text).toContain(
      '### Reasons\n1. laptop: one guest, one therapist\n2. stayIn: one guest, one therapist',
    );
    expect(text.endsWith(`### Facts\n1. ${fact}`)).toBe(true);
    expect(text.indexOf('### Image set-ups')).toBeLessThan(text.indexOf('### Reasons'));
    expect(text.indexOf('### Reasons')).toBeLessThan(text.indexOf('### Facts'));
    expect(text).not.toContain('### Questions');
  });

  // Amended 2026-11-23, after the second recordings: who is in each image.
  const fourHands = setupAt('night', {
    reason: 'firstNight',
    look: 'fourHands',
    guests: 'woman',
    therapists: 2,
  });
  const couple = setupAt('day', {
    reason: 'twoOfYou',
    look: 'couple',
    guests: 'couple',
    therapists: 2,
  });

  it('each reason line says its guests and therapists', () => {
    expect(peopleOf(laptop)).toBe('one guest, one therapist');
    expect(peopleOf(fourHands)).toBe('one guest, two therapists');
    expect(peopleOf(couple)).toBe('two guests, two therapists');
    const text = planUserText(input, [], undefined, [fourHands, couple]);
    expect(text).toContain(
      '### Reasons\n1. firstNight: one guest, two therapists\n2. twoOfYou: two guests, two therapists',
    );
  });

  it('a plan without reasons says nothing of its guests and therapists', () => {
    const { reason: _, ...plain } = laptop;
    const text = planUserText(input, [], undefined, [plain]);
    expect(text).not.toContain('### Reasons');
    expect(text).not.toContain('one therapist');
  });

  const sent = (text: string, heading: string) => {
    const start = text.indexOf(`${heading}\n`) + heading.length + 1;
    const end = text.indexOf('\n\n###', start);
    return JSON.parse(text.slice(start, end === -1 ? undefined : end));
  };

  it('a caption update gives each post its reason and fact, and none to a post without', () => {
    const posts = [post({ id: 'a', setup: laptop }), post({ id: 'b', setup: stayIn })];
    const [a, b] = sent(rewriteUserText(input, posts), '### Posts');
    expect(a).toMatchObject({ light: 'night', reason: 'laptop', fact });
    expect(b.reason).toBe('stayIn');
    expect('fact' in b).toBe(false);
    const [bare] = sent(rewriteUserText(input, [post({ id: 'c' })]), '### Posts');
    expect('reason' in bare).toBe(false);
  });

  it('a caption update and new texts give each post with a reason its therapists', () => {
    const { reason: _, ...reasonless } = laptop;
    const posts = [
      post({ id: 'a', setup: { ...laptop, treatment: 'Balinese Massage' } }),
      post({ id: 'b', setup: fourHands }),
      post({ id: 'c', setup: reasonless }),
      post({ id: 'd' }),
    ];
    const [a, b, c, d] = sent(rewriteUserText(input, posts), '### Posts');
    expect(a.therapists).toBe(1);
    expect(b.therapists).toBe(2);
    expect('therapists' in c).toBe(false);
    expect('therapists' in d).toBe(false);
    const one = sent(
      newTextsUserText(input, post({ id: 'b', setup: fourHands }), undefined),
      '### Post',
    );
    expect(one.therapists).toBe(2);
    // The set-up's treatment and part, for "names only what its image shows"
    // (the third recordings, 2026-11-23).
    expect(a).toMatchObject({ treatment: 'Balinese Massage', bodyPart: laptop.bodyPart });
    expect(one).toMatchObject({ bodyPart: fourHands.bodyPart });
    expect('bodyPart' in c).toBe(false);
    expect('treatment' in d).toBe(false);
  });

  it('new texts give the post its reason and fact', () => {
    const one = sent(
      newTextsUserText(input, post({ id: 'a', setup: laptop }), undefined),
      '### Post',
    );
    expect(one).toMatchObject({ light: 'night', reason: 'laptop', fact });
  });
});

describe("the prompts show only the other reasons' samples", () => {
  const laptop = SAMPLES.find((s) => s.reason === 'laptop');
  it('a plan, a caption update and new texts leave out the reasons given', () => {
    for (const prompt of [
      reasonsPlanPrompt(false, true, ['laptop']),
      reasonsRewritePrompt(false, true, ['laptop']),
      reasonsNewTextsPrompt(false, true, ['laptop']),
    ]) {
      expect(prompt).not.toContain(laptop?.caption);
      expect(prompt).not.toContain(laptop?.story);
      expect(prompt).toContain(samplesText(['laptop']));
    }
  });
});

// Amended 2026-11-23, after the second recordings: the caption names only
// what its image shows, the hours come in words, and twoOfYou names a moment.
describe("the second amendment's rules", () => {
  // The third recordings (2026-11-23): a question built like dayOut's, for
  // both of them; no abstract words for the model to copy ("another moment
  // the two of you share…").
  const twoOfYou = (part: string) =>
    `- twoOfYou: two guests, a couple or friends, both massaged at the same time, side by side, each with their own therapist. Its question speaks to both of them, as "both of you" or "the two of you", and names the part of the body its ${part} and the day out they had together: one of the essence's moments about a day out, or one of the business's real places, never the other post's; or, on a night post, their evening in.`;
  const onlyWhatItShows = (treatment: string, people: string, part: string) =>
    `- The caption names only what its image shows: ${treatment}, never another of the business's treatments; as many therapists as ${people} says, "two therapists" only when it says two, otherwise "a therapist", "your therapist" or "she"; and for dayOut, twoOfYou and laptop, ${part}.`;
  const plan = onlyWhatItShows(
    "its set-up's treatment",
    'its line under "### Reasons"',
    "its set-up's part of the body",
  );
  const update = onlyWhatItShows('its "treatment"', 'its "therapists"', 'its "bodyPart"');
  const prompts = [
    ['plan', reasonsPlanPrompt(false, true), 'set-up gives', plan],
    ['rewrite', reasonsRewritePrompt(false, true), 'image prompt shows', update],
    ['new texts', reasonsNewTextsPrompt(false, true), 'image prompt shows', update],
  ] as const;
  for (const [name, prompt, part, shows] of prompts) {
    it(`the ${name} prompt: twoOfYou's question, only what the image shows, the fact as given`, () => {
      expect(prompt).toContain(twoOfYou(part));
      expect(prompt).toContain(shows);
      expect(prompt).toContain('in one short sentence, as given.');
      expect(prompt).toContain(
        "- Facts only from the profile and the post's fact: a duration, a number of years, a place name, a quality (signature, expert, best) or a claim appears only if one of them holds it, written as it is written there.",
      );
      expect(prompt).not.toContain('Hours: …');
      expect(prompt).not.toContain('until when the business comes');
      expect(prompt).not.toContain('moment they share');
      expect(prompt).not.toContain('another moment');
    });
  }

  it('new texts keep the part of the body for dayOut and twoOfYou', () => {
    expect(reasonsNewTextsPrompt(false, true)).toContain(
      'For dayOut and twoOfYou, the part of the body stays its "bodyPart": ask after another day out, or in other words.',
    );
  });
});

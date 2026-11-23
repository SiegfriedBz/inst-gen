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
import { samplesText } from '@/lib/posts/samples';
import { svargaProfile } from './helpers/brand';
import { post, setupAt } from './helpers/posts';

// The posts-19 prompt for a business that comes to its guests
// (docs/specs/posts/reasons-to-book, "What the model gets").

const REASON_LINES = ['- dayOut:', '- stayIn:', '- twoOfYou:', '- firstNight:', '- laptop:'];

describe('reasonsPlanPrompt', () => {
  const prompt = reasonsPlanPrompt(false, true);

  it('is posts-19', () => {
    expect(REASONS_PROMPT_VERSION).toBe('posts-19');
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
    expect(text).toContain('### Reasons\n1. laptop\n2. stayIn');
    expect(text.endsWith(`### Facts\n1. ${fact}`)).toBe(true);
    expect(text.indexOf('### Image set-ups')).toBeLessThan(text.indexOf('### Reasons'));
    expect(text.indexOf('### Reasons')).toBeLessThan(text.indexOf('### Facts'));
    expect(text).not.toContain('### Questions');
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

  it('new texts give the post its reason and fact', () => {
    const one = sent(
      newTextsUserText(input, post({ id: 'a', setup: laptop }), undefined),
      '### Post',
    );
    expect(one).toMatchObject({ light: 'night', reason: 'laptop', fact });
  });
});

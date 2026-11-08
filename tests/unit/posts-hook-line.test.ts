import { describe, expect, it } from 'vitest';
import { hookOnItsLine } from '@/lib/posts/hook-line';

// docs/specs/posts/marketing-copy, "The hook alone on the first line".
describe('hookOnItsLine', () => {
  it('puts a blank line after the first sentence and its emoji', () => {
    expect(
      hookOnItsLine('Sore shoulders from the paddle out? 🌸 Our therapists come to your villa.'),
    ).toBe('Sore shoulders from the paddle out? 🌸\n\nOur therapists come to your villa.');
  });

  it('ends the hook at an emoji when its stop is gone', () => {
    expect(hookOnItsLine('Sore feet 🌺 Warm oil helps.')).toBe('Sore feet 🌺\n\nWarm oil helps.');
  });

  it('keeps every emoji right after the hook with it', () => {
    expect(hookOnItsLine('Hook! 🌸🌺 Body.')).toBe('Hook! 🌸🌺\n\nBody.');
  });

  it('splits only the first line', () => {
    expect(hookOnItsLine('Hook? Body.\nMore.')).toBe('Hook?\n\nBody.\nMore.');
  });

  it('leaves a hook that already stands alone, or a caption with no sentence end', () => {
    for (const caption of [
      'Sore feet?\n\nWarm oil.',
      'One sentence only. 🌸',
      'Warm oil and slow hands',
      'Warm oil and slow hands 🌸',
    ]) {
      expect(hookOnItsLine(caption)).toBe(caption);
    }
  });

  it('never ends the hook inside a time', () => {
    expect(hookOnItsLine('Open until 23.00 tonight, we come to you. Warm oil.')).toBe(
      'Open until 23.00 tonight, we come to you.\n\nWarm oil.',
    );
  });

  // The final review: "11 p.m." isn't a sentence's end.
  it('never ends the hook at a stop a lower-case word follows', () => {
    expect(hookOnItsLine('Open until 11 p.m. tonight, we come to you. Warm oil.')).toBe(
      'Open until 11 p.m. tonight, we come to you.\n\nWarm oil.',
    );
  });

  it('never ends the hook at an emoji inside a sentence', () => {
    expect(hookOnItsLine('Frangipani 🌸 petals on the tray. Warm oil.')).toBe(
      'Frangipani 🌸 petals on the tray.\n\nWarm oil.',
    );
  });
});

import { APICallError } from 'ai';
import { describe, expect, test } from 'vitest';
import { IMAGE_MODEL, IMAGE_USD, toImageModelError } from '@/lib/ai/image-model';

const apiError = (statusCode: number, message: string) =>
  new APICallError({ message, url: 'https://example.test', requestBodyValues: {}, statusCode });

describe('the image model', () => {
  test('is Nano Banana 2.1 at about $0.05 an image', () => {
    expect(IMAGE_MODEL).toBe('gemini-nano-banana-2.1');
    expect(IMAGE_USD).toBe(0.05);
  });

  test('429 is paused', () => {
    expect(toImageModelError(apiError(429, 'Resource exhausted')).kind).toBe('paused');
  });

  test('a spent prepaid balance is paused', () => {
    expect(toImageModelError(apiError(403, 'Your prepayment credits are depleted')).kind).toBe(
      'paused',
    );
  });

  test('a nested 429 is paused', () => {
    expect(toImageModelError(new Error('x', { cause: apiError(429, '') })).kind).toBe('paused');
  });

  test('anything else is failed', () => {
    expect(toImageModelError(apiError(500, 'boom')).kind).toBe('failed');
    expect(toImageModelError(apiError(403, 'API key not valid')).kind).toBe('failed');
    expect(toImageModelError(new Error('x')).kind).toBe('failed');
  });
});

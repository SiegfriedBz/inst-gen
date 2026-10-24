import { describe, expect, test } from 'vitest';
import { formatReadLog, type ReadLog } from '@/lib/brand/read-log';

const entry: ReadLog = {
  host: 'svargabalimassage.com',
  pages: 1,
  photos: 3,
  fetchMs: 876,
  firstPartialMs: 9817,
  totalMs: 17381,
  outcome: 'final',
};

describe('formatReadLog', () => {
  test('gives one line with the timings and the outcome', () => {
    expect(formatReadLog(entry)).toBe(
      'brand read host=svargabalimassage.com pages=1 photos=3 fetch_ms=876 first_partial_ms=9817 total_ms=17381 outcome=final',
    );
  });

  test('a read with no model partial shows a dash', () => {
    expect(formatReadLog({ ...entry, firstPartialMs: null })).toContain(' first_partial_ms=- ');
  });

  test("the model's error stays on one line, cut to 300 characters", () => {
    const line = formatReadLog({
      ...entry,
      outcome: 'model_busy',
      modelError: `high\ndemand "now" ${'x'.repeat(2_000)}`,
    });
    expect(line).not.toContain('\n');
    expect(line).toContain(' outcome=model_busy model_error="high demand \\"now\\" x');
    const message = line.slice(line.indexOf('model_error="') + 'model_error="'.length, -1);
    expect(message.replaceAll('\\"', '"')).toHaveLength(300);
  });
});

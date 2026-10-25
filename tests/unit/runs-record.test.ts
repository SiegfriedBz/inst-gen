import { describe, expect, test } from 'vitest';
import {
  isFinished,
  newBrandRun,
  newImagesRun,
  newPostsRun,
  type RunRecord,
  resumeRun,
  stepsToRequest,
} from '@/lib/runs/run-record';
import { svargaProfile } from './helpers/brand';

const run = newBrandRun(
  { ownerId: 'sen', url: 'sendanangmassage.com', reread: false },
  new Date('2026-10-24T10:00:00Z'),
  'r1',
);

describe('the run record', () => {
  test('a new run starts with the brand step running', () => {
    expect(run).toEqual({
      id: 'r1',
      ownerId: 'sen',
      kind: 'brand-read',
      reread: false,
      url: 'sendanangmassage.com',
      startedAt: '2026-10-24T10:00:00.000Z',
      steps: [{ name: 'brand', status: 'running' }],
    });
    expect(isFinished(run)).toBe(false);
  });

  test('a running step with no live request goes back to pending', () => {
    const resumed = resumeRun(run, () => false);
    expect(resumed.steps[0]?.status).toBe('pending');
    expect(stepsToRequest(resumed)).toEqual(['brand']);
  });

  test('a running step whose request is alive is left alone', () => {
    expect(stepsToRequest(resumeRun(run, () => true))).toEqual([]);
  });

  test('a done step is never requested again', () => {
    const done: RunRecord = {
      ...run,
      steps: [{ name: 'brand', status: 'done', output: svargaProfile() }],
    };
    expect(stepsToRequest(resumeRun(done, () => false))).toEqual([]);
    expect(isFinished(done)).toBe(true);
  });

  test('a failed step is finished and not requested', () => {
    const failed: RunRecord = { ...run, steps: [{ name: 'brand', status: 'failed' }] };
    expect(stepsToRequest(resumeRun(failed, () => false))).toEqual([]);
    expect(isFinished(failed)).toBe(true);
  });
});

describe('a posts run', () => {
  const posts = newPostsRun(
    { ownerId: 'sen', step: 'plan' },
    new Date('2026-10-25T10:00:00Z'),
    'r2',
  );

  test('starts with its plan step running', () => {
    expect(posts).toMatchObject({
      id: 'r2',
      ownerId: 'sen',
      kind: 'posts',
      steps: [{ name: 'plan', status: 'running' }],
    });
  });

  test('a lost plan step goes back to pending and is requested again', () => {
    const resumed = resumeRun(posts, () => false);
    expect(stepsToRequest(resumed)).toEqual(['plan']);
  });

  test('a done rewrite step is never requested again', () => {
    const rewrite = newPostsRun(
      { ownerId: 'sen', step: 'rewrite', batchId: 'b1' },
      new Date('2026-10-25T10:00:00Z'),
      'r3',
    );
    const done: RunRecord = { ...rewrite, steps: [{ name: 'rewrite', status: 'done' }] };
    expect(rewrite.batchId).toBe('b1');
    expect(stepsToRequest(resumeRun(done, () => false))).toEqual([]);
    expect(isFinished(done)).toBe(true);
  });
});

describe('an images run', () => {
  const images = newImagesRun(
    { ownerId: 'sen', batchId: 'b1', postIds: ['post-1', 'post-2'] },
    new Date('2026-10-25T10:00:00Z'),
    'r1',
  );

  test('newImagesRun has one running image step per post', () => {
    expect(images).toMatchObject({ id: 'r1', ownerId: 'sen', kind: 'images', batchId: 'b1' });
    expect(images.steps).toEqual([
      { name: 'image', postId: 'post-1', status: 'running' },
      { name: 'image', postId: 'post-2', status: 'running' },
    ]);
  });

  test('resume sets lost image steps back to pending', () => {
    const resumed = resumeRun(images, () => false);
    expect(resumed.steps.map((s) => s.status)).toEqual(['pending', 'pending']);
    expect(stepsToRequest(resumed)).toEqual(['image', 'image']);
  });
});

'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Profile } from '@/lib/brand/profile';
import type { RunningRead } from '@/lib/brand/read-client';
import { holdWakeLock } from '@/lib/brand/wake-lock';
import { POSTS_LIMITS, type Post, type PostBatch, type PostsErrorCode } from '@/lib/posts/batch';
import { type PostsEvent, resumePosts, startPlan, startRewrite } from '@/lib/posts/client';
import { ctaFor } from '@/lib/posts/input';
import { isStale, loadBatches, recentPosts } from '@/lib/posts/store';
import { PostCard } from './post-card';

// "Your posts" under the brand panel (docs/specs/posts/generate-copy): the
// button that makes a batch, the posts as they stream in, and every batch
// kept on the phone, newest first. Shown only with the panel, so never during
// a brand read.

type Running = { step: 'plan' | 'rewrite'; batchId?: string; posts: Post[] };

export function PostsSection({ ownerId, profile }: { ownerId: string; profile: Profile }) {
  const t = useTranslations('posts');
  const brand = useTranslations('brand');
  const [batches, setBatches] = useState<PostBatch[]>([]);
  const [running, setRunning] = useState<Running | null>(null);
  const [error, setError] = useState<PostsErrorCode | 'offline' | null>(null);
  const [fewer, setFewer] = useState<number | null>(null);
  const request = useRef<RunningRead | null>(null);
  const lock = useRef<{ release(): void } | null>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const end = useCallback(() => {
    lock.current?.release();
    lock.current = null;
    request.current = null;
    setRunning(null);
  }, []);

  const onEvent = useCallback(
    (event: PostsEvent) => {
      if (event.type === 'post') {
        setRunning((r) => (r ? { ...r, posts: [...r.posts, event.post] } : r));
      } else if (event.type === 'final') {
        end();
        setError(null);
        setBatches((list) => [event.batch, ...list.filter((b) => b.id !== event.batch.id)]);
        setFewer(event.batch.posts.length < POSTS_LIMITS.posts ? event.batch.posts.length : null);
      } else if (event.type === 'error') {
        end();
        setError(event.code);
      } else if (event.type === 'offline') {
        // The run waits for the owner to come back: let the screen sleep.
        lock.current?.release();
        lock.current = null;
        setError('offline');
      } else {
        window.location.assign('/enter');
      }
    },
    [end],
  );

  const begin = useCallback((run: RunningRead, state: Running) => {
    request.current = run;
    lock.current ??= holdWakeLock();
    setError(null);
    setFewer(null);
    setRunning(state);
  }, []);

  const tryResume = useCallback(async () => {
    const run = await resumePosts(ownerId, profileRef.current, onEvent);
    if (run) begin(run, { step: run.step, posts: [] });
  }, [ownerId, onEvent, begin]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const saved = await loadBatches(ownerId);
      if (!active) return;
      setBatches(saved);
      await tryResume();
    })();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void tryResume();
    };
    const onOnline = () => void tryResume();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      request.current?.stop();
      lock.current?.release();
    };
  }, [ownerId, tryResume]);

  function make() {
    const run = startPlan({ ownerId, profile, recent: recentPosts(batches) }, onEvent);
    begin(run, { step: 'plan', posts: [] });
  }

  function update(batch: PostBatch) {
    const run = startRewrite({ ownerId, profile, batch }, onEvent);
    begin(run, { step: 'rewrite', batchId: batch.id, posts: [] });
  }

  const cta = ctaFor(profile);
  const busy = running !== null;
  return (
    <section className="mt-6 flex flex-col gap-3">
      <Button type="button" onClick={make} disabled={!cta || busy}>
        {batches.length > 0 ? t('makeMore') : t('make')}
      </Button>
      {!cta && <p className="text-[13px] text-error">{brand('panel.warnWhatsapp')}</p>}
      {busy && <p className="text-[13px] text-ink-secondary">{t('keepOpen')}</p>}
      {error && (
        <p
          role="alert"
          className="rounded-control border border-error px-4 py-3 text-[15px] text-error"
        >
          {t(`errors.${error}`)}
        </p>
      )}
      {(batches.length > 0 || (running?.step === 'plan' && running.posts.length > 0)) && (
        <h2 className="mt-3 text-[17px] font-medium tracking-[-0.01em]">{t('heading')}</h2>
      )}
      {fewer !== null && (
        <p className="text-[13px] text-ink-secondary">{t('fewer', { count: fewer })}</p>
      )}
      {running?.step === 'plan' &&
        running.posts.map((post) => <PostCard key={post.id} post={post} cta={cta ?? post.cta} />)}
      {batches.map((batch) => (
        <div key={batch.id} className="flex flex-col gap-3">
          {isStale(batch, profile) && (
            <div className="rounded-control bg-accent-tint px-4 py-3 text-[15px] text-accent-tint-ink">
              <p>{t('stale')}</p>
              <Button type="button" className="mt-2" onClick={() => update(batch)} disabled={busy}>
                {t('update')}
              </Button>
            </div>
          )}
          {batch.posts.map((post) => (
            <PostCard key={post.id} post={post} cta={cta ?? post.cta} />
          ))}
        </div>
      ))}
    </section>
  );
}

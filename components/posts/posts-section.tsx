'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Profile } from '@/lib/brand/profile';
import type { RunningRead } from '@/lib/brand/read-client';
import { holdWakeLock } from '@/lib/brand/wake-lock';
import { POSTS_LIMITS, type Post, type PostBatch, type PostsErrorCode } from '@/lib/posts/batch';
import { type PostsEvent, resumePosts, startPlan, startRewrite } from '@/lib/posts/client';
import {
  applyEdit,
  autoRewrite,
  flagsFor,
  isPostStale,
  markNewImage,
  newestBatch,
  type PostEdit,
  staleUnedited,
} from '@/lib/posts/edit';
import { type ImageEvent, resumeImages, startImages } from '@/lib/posts/image-client';
import { imageKey, loadImages, type SavedImage } from '@/lib/posts/image-store';
import { ctaFor, profileHash } from '@/lib/posts/input';
import { loadBatches, recentPosts, saveBatch } from '@/lib/posts/store';
import { CaptionTranslation } from './caption-translation';
import { FeedPreview } from './feed-preview';
import { PostCard } from './post-card';
import type { ImageState } from './post-image';
import { TakeAway } from './take-away';

// "Your posts" under the brand panel (docs/specs/posts/generate-copy): the
// button that makes a batch, the posts as they stream in, and every batch
// kept on the phone, newest first. Shown only with the panel, so never during
// a brand read. Once a plan is saved, its six images are asked for
// (docs/specs/posts/generate-images) when images are on for this owner.
// While its tab shows, the newest batch's captions follow the business
// details by themselves (docs/specs/platform/home-tabs).

type Running = { step: 'plan' | 'rewrite'; batchId?: string; posts: Post[] };

type ImageFailure = Extract<ImageState, { kind: 'failed' }>['code'];

export function PostsSection({
  ownerId,
  profile,
  imagesOn,
  active,
  searching,
}: {
  ownerId: string;
  profile: Profile;
  imagesOn: boolean;
  // "Create your posts" is the tab showing.
  active: boolean;
  // The essence search is running: its answer changes the details again.
  searching: boolean;
}) {
  const t = useTranslations('posts');
  const brand = useTranslations('brand');
  const [batches, setBatches] = useState<PostBatch[]>([]);
  const [running, setRunning] = useState<Running | null>(null);
  const [error, setError] = useState<PostsErrorCode | 'offline' | null>(null);
  const [fewer, setFewer] = useState<number | null>(null);
  // True until the first look for a lost run ends, and while one resumes, so
  // a tap can't start a second run beside it.
  const [resuming, setResuming] = useState(true);
  const mounted = useRef(false);
  const resumeRef = useRef<() => Promise<void>>(async () => {});
  const request = useRef<RunningRead | null>(null);
  const lock = useRef<{ release(): void } | null>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const stepRef = useRef<Running['step'] | null>(null);
  const batchesRef = useRef<PostBatch[]>([]);
  batchesRef.current = batches;
  const [images, setImages] = useState<Map<string, SavedImage>>(new Map());
  const [making, setMaking] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState<Map<string, ImageFailure>>(new Map());
  const imageRuns = useRef(new Set<RunningRead>());
  const imageLock = useRef<{ release(): void } | null>(null);
  // True while lost images are looked up, so a tap can't ask for them twice.
  const [imagesResuming, setImagesResuming] = useState(imagesOn);
  // An image dropped with the phone still online: asked for again once its
  // run has ended, as the posts are.
  const droppedOnline = useRef(false);
  // Posts whose new image (not a first one) is being made, by `imageKey`: its
  // answer asks the owner to check the image description.
  const remaking = useRef(new Set<string>());
  // The details (by `profileHash`) the automatic update last went out for:
  // never twice for the same details, so a failure or a dropped post waits
  // for the owner, until the tab is opened again.
  const [triedHash, setTriedHash] = useState<string | null>(null);
  const wasActive = useRef(active);

  const onImageEvent = useCallback((event: ImageEvent) => {
    if (event.type === 'signedOut') {
      window.location.assign('/enter');
      return;
    }
    const key =
      event.type === 'image'
        ? imageKey(event.image.batchId, event.image.postId)
        : imageKey(event.batchId, event.postId);
    setMaking((set) => {
      const next = new Set(set);
      next.delete(key);
      return next;
    });
    if (event.type === 'image') {
      setImages((map) => new Map(map).set(key, event.image));
      if (remaking.current.delete(key)) {
        const batch = batchesRef.current.find((b) => b.id === event.image.batchId);
        if (batch) {
          const next = markNewImage(batch, event.image.postId);
          batchesRef.current = batchesRef.current.map((b) => (b.id === next.id ? next : b));
          setBatches(batchesRef.current);
          void saveBatch(next);
        }
      }
    } else {
      const code = event.type === 'offline' ? 'offline' : event.code;
      if (event.type !== 'offline') remaking.current.delete(key);
      if (event.type === 'offline' && navigator.onLine) droppedOnline.current = true;
      setFailed((map) => new Map(map).set(key, code));
    }
  }, []);

  // Keeps an images request: the screen awake while any runs, all stopped
  // when the section closes. `keys` are the posts' `imageKey`s.
  const trackImages = useCallback((run: RunningRead, keys: string[]) => {
    imageRuns.current.add(run);
    imageLock.current ??= holdWakeLock();
    setMaking((set) => new Set([...set, ...keys]));
    setFailed((map) => {
      const next = new Map(map);
      for (const key of keys) next.delete(key);
      return next;
    });
    void run.done.then(() => {
      imageRuns.current.delete(run);
      if (imageRuns.current.size === 0) {
        imageLock.current?.release();
        imageLock.current = null;
      }
      if (droppedOnline.current && mounted.current) {
        droppedOnline.current = false;
        void resumeImagesRef.current();
      }
    });
  }, []);

  const makeImages = useCallback(
    (batch: PostBatch, postIds: string[], hint?: string) => {
      trackImages(
        startImages({ ownerId, batch, postIds, ...(hint ? { hint } : {}) }, onImageEvent),
        postIds.map((id) => imageKey(batch.id, id)),
      );
    },
    [ownerId, onImageEvent, trackImages],
  );

  const tryResumeImages = useCallback(async () => {
    if (!imagesOn) return;
    setImagesResuming(true);
    try {
      const run = await resumeImages(ownerId, batchesRef.current, onImageEvent);
      if (!run) return;
      if (!mounted.current) run.stop();
      else trackImages(run, run.keys);
    } finally {
      if (mounted.current) setImagesResuming(false);
    }
  }, [imagesOn, ownerId, onImageEvent, trackImages]);
  const resumeImagesRef = useRef(tryResumeImages);
  resumeImagesRef.current = tryResumeImages;

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
        const planned = stepRef.current === 'plan';
        end();
        setError(null);
        setBatches((list) => [event.batch, ...list.filter((b) => b.id !== event.batch.id)]);
        if (planned && imagesOn) {
          makeImages(
            event.batch,
            event.batch.posts.map((p) => p.id),
          );
        }
        setFewer(event.batch.posts.length < POSTS_LIMITS.posts ? event.batch.posts.length : null);
      } else if (event.type === 'error') {
        end();
        setError(event.code);
      } else if (event.type === 'offline') {
        // The cards of a lost step go away; it is asked for again when the
        // owner is back, or now when only the connection to us dropped.
        const lost = request.current;
        lock.current?.release();
        lock.current = null;
        request.current = null;
        setRunning(null);
        if (navigator.onLine) void lost?.done.then(() => resumeRef.current());
        else setError('offline');
      } else {
        window.location.assign('/enter');
      }
    },
    [end, imagesOn, makeImages],
  );

  const begin = useCallback((run: RunningRead, state: Running) => {
    request.current = run;
    stepRef.current = state.step;
    lock.current ??= holdWakeLock();
    setError(null);
    setFewer(null);
    setRunning(state);
  }, []);

  const tryResume = useCallback(async () => {
    setResuming(true);
    try {
      const run = await resumePosts(ownerId, profileRef.current, onEvent);
      if (!run) return;
      // The section closed (a Forget, a re-read) while the run was looked up.
      if (!mounted.current) run.stop();
      else begin(run, { step: run.step, posts: [] });
    } finally {
      if (mounted.current) setResuming(false);
    }
  }, [ownerId, onEvent, begin]);
  resumeRef.current = tryResume;

  useEffect(() => {
    mounted.current = true;
    let active = true;
    void (async () => {
      const saved = await loadBatches(ownerId);
      const savedImages = await loadImages(ownerId);
      if (!active) return;
      batchesRef.current = saved;
      setBatches(saved);
      setImages(savedImages);
      await tryResume();
      await resumeImagesRef.current();
    })();
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void tryResume();
        void resumeImagesRef.current();
      }
    };
    const onOnline = () => {
      void tryResume();
      void resumeImagesRef.current();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      active = false;
      mounted.current = false;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      request.current?.stop();
      lock.current?.release();
      for (const run of imageRuns.current) run.stop();
      imageLock.current?.release();
    };
  }, [ownerId, tryResume]);

  function make() {
    const run = startPlan({ ownerId, profile, recent: recentPosts(batches) }, onEvent);
    begin(run, { step: 'plan', posts: [] });
  }

  // Rewrites the posts named; edited posts are only sent when asked for one
  // by one (docs/specs/posts/editor-download).
  const update = useCallback(
    (batch: PostBatch, postIds: string[]) => {
      const run = startRewrite({ ownerId, profile, batch, postIds }, onEvent);
      begin(run, { step: 'rewrite', batchId: batch.id, posts: [] });
    },
    [ownerId, profile, onEvent, begin],
  );

  // The owner's words, kept on the phone only (docs/specs/posts/editor-download).
  function saveEdit(batchId: string, postId: string, edit: PostEdit) {
    const current = batchesRef.current.find((b) => b.id === batchId);
    if (!current) return;
    const next: PostBatch = {
      ...current,
      posts: current.posts.map((p) => (p.id === postId ? applyEdit(p, edit, profile) : p)),
    };
    batchesRef.current = batchesRef.current.map((b) => (b.id === batchId ? next : b));
    setBatches(batchesRef.current);
    void saveBatch(next);
  }

  const cta = ctaFor(profile);
  const busy = running !== null || resuming || imagesResuming || making.size > 0;
  const currentHash = profileHash(profile);
  const newest = newestBatch(batches);
  const behind = newest ? staleUnedited(newest, profile) : [];
  // The newest batch's update is on its way: waiting for the search, the
  // images or the tab, or running.
  const updating = behind.length > 0 && (triedHash !== currentHash || running?.step === 'rewrite');
  // While the update waits for the search, nothing else starts: one rewrite
  // against the final details, and the waiting batch stays the newest.
  const waiting = searching && behind.length > 0;
  const held = busy || waiting;

  // Opening the tab again lets a failed update try once more.
  useEffect(() => {
    if (active && !wasActive.current) setTriedHash(null);
    wasActive.current = active;
  }, [active]);

  useEffect(() => {
    if (!active || searching || busy || triedHash === currentHash) return;
    const next = autoRewrite(batches, profile);
    if (!next) return;
    setTriedHash(currentHash);
    update(next.batch, next.postIds);
  }, [active, searching, busy, triedHash, currentHash, batches, profile, update]);

  function imageOf(post: Post, batch: PostBatch, batchButton: boolean) {
    const retry = () => makeImages(batch, [post.id]);
    const key = imageKey(batch.id, post.id);
    const saved = images.get(key);
    const newImage = (hint: string) => {
      if (saved) remaking.current.add(key);
      makeImages(batch, [post.id], hint.trim() || undefined);
    };
    let state: ImageState;
    if (!imagesOn) state = { kind: 'off' };
    else if (saved) {
      const failure = failed.get(key);
      state = {
        kind: 'ready',
        image: saved,
        making: making.has(key),
        ...(failure ? { failure } : {}),
      };
    } else if (making.has(key)) state = { kind: 'making' };
    else {
      const code = failed.get(key);
      state = code ? { kind: 'failed', code } : { kind: 'none' };
    }
    return {
      state,
      onRetry: batchButton ? undefined : retry,
      onNewImage: imagesOn ? newImage : undefined,
    };
  }
  return (
    <section className="mt-6 flex flex-col gap-3">
      <Button type="button" onClick={make} disabled={!cta || held}>
        {batches.length > 0 ? t('makeMore') : t('make')}
      </Button>
      {!cta && <p className="text-[13px] text-error">{brand('panel.warnWhatsapp')}</p>}
      {(busy || updating) && <p className="text-[13px] text-ink-secondary">{t('keepOpen')}</p>}
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
      {batches.map((batch) => {
        const needsImages =
          imagesOn &&
          !batch.posts.some((p) => {
            const key = imageKey(batch.id, p.id);
            return images.has(key) || making.has(key);
          });
        const isNewest = batch === newest;
        const stale = isNewest && !updating ? behind : [];
        return (
          <div key={batch.id} className="flex flex-col gap-3">
            {needsImages && (
              <Button
                type="button"
                onClick={() =>
                  makeImages(
                    batch,
                    batch.posts.map((p) => p.id),
                  )
                }
                disabled={held}
              >
                {t('images.make')}
              </Button>
            )}
            {imagesOn && (
              <FeedPreview
                batch={batch}
                images={images}
                onPick={(postId) =>
                  document
                    .getElementById(`post-${batch.id}-${postId}`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              />
            )}
            {isNewest && updating && (
              <p
                role="status"
                className="rounded-control bg-accent-tint px-4 py-3 text-[15px] text-accent-tint-ink"
              >
                {t('updating')}
              </p>
            )}
            {stale.length > 0 && (
              <div className="rounded-control bg-accent-tint px-4 py-3 text-[15px] text-accent-tint-ink">
                <p>{t('stale')}</p>
                {batch.posts.some((p) => p.edited) && <p>{t('staleEdited')}</p>}
                <Button
                  type="button"
                  className="mt-2"
                  onClick={() =>
                    update(
                      batch,
                      stale.map((p) => p.id),
                    )
                  }
                  disabled={held}
                >
                  {t('update')}
                </Button>
              </div>
            )}
            {batch.posts.map((post, index) => (
              <PostCard
                key={post.id}
                post={post}
                cta={cta ?? post.cta}
                number={index + 1}
                anchorId={`post-${batch.id}-${post.id}`}
                onSave={(edit) => saveEdit(batch.id, post.id, edit)}
                image={imageOf(post, batch, needsImages)}
                flags={flagsFor(post, batch, profile, isNewest)}
                onRewrite={
                  isNewest && post.edited && isPostStale(post, batch, profile)
                    ? () => update(batch, [post.id])
                    : undefined
                }
                busy={held}
                editBusy={running !== null || resuming || waiting}
                translation={
                  <CaptionTranslation
                    key={post.caption}
                    ownerId={ownerId}
                    batchId={batch.id}
                    postId={post.id}
                    caption={post.caption}
                  />
                }
                takeAway={
                  <TakeAway
                    post={post}
                    cta={cta ?? post.cta}
                    image={images.get(imageKey(batch.id, post.id))}
                    name={profile.name.value}
                    createdAt={batch.createdAt}
                    number={index + 1}
                  />
                }
              />
            ))}
          </div>
        );
      })}
    </section>
  );
}

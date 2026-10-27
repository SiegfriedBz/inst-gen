'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { UsageMessage } from '@/components/usage/usage-message';
import { useAtLimit } from '@/components/usage/usage-provider';
import type { Profile } from '@/lib/brand/profile';
import type { RunningRead } from '@/lib/brand/read-client';
import { holdWakeLock } from '@/lib/brand/wake-lock';
import type { Post, PostBatch, PostsErrorCode } from '@/lib/posts/batch';
import { type PostsEvent, resumePosts, startPlan, startRewrite } from '@/lib/posts/client';
import { attemptNumbers, dayStart } from '@/lib/posts/day';
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
import { DEFAULT_ANSWERS, type OfferAnswers, toOffer } from '@/lib/posts/offer';
import { clearOffer, loadOffer, type OfferRecord, saveOffer } from '@/lib/posts/offer-store';
import { clearBefore, loadBatches, recentPosts, saveBatch } from '@/lib/posts/store';
import { markTaken, type TakenStep, takenLabel } from '@/lib/posts/taken';
import { isUsageCode, type UsageCode } from '@/lib/usage/codes';
import { CaptionTranslation } from './caption-translation';
import { OfferLine } from './offer-line';
import { OfferSheet } from './offer-sheet';
import { PostCard, SHOWN_FLAGS } from './post-card';
import type { ImageState } from './post-image';
import { SuggestionSheet } from './suggestion-sheet';
import { SuggestionTile } from './suggestion-tile';
import { TakeAway } from './take-away';

// "Create your posts" (docs/specs/posts/suggestions): the button that makes
// an attempt of six suggestions, the suggestions as they stream in, and the
// attempts made since Google's reset (docs/specs/platform/one-daily-reset),
// newest on top; anything
// older is cleared when the section loads. Once a plan is saved, its six
// images are asked for (docs/specs/posts/generate-images) when images are on
// for this owner.
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
  onAddTreatments,
}: {
  ownerId: string;
  profile: Profile;
  imagesOn: boolean;
  // "Create your posts" is the tab showing.
  active: boolean;
  // The essence search is running: its answer changes the details again.
  searching: boolean;
  // Opens "Your business" on its treatments, for an offer with none.
  onAddTreatments?: () => void;
}) {
  const t = useTranslations('posts');
  const brand = useTranslations('brand');
  const [batches, setBatches] = useState<PostBatch[]>([]);
  // Today's special offer (docs/specs/posts/special-offer), kept on the phone.
  const [offer, setOffer] = useState<OfferRecord | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [running, setRunning] = useState<Running | null>(null);
  const [error, setError] = useState<PostsErrorCode | UsageCode | 'offline' | null>(null);
  // Which step the error line is about: a plan's limit and a rewrite's differ.
  const [errorStep, setErrorStep] = useState<Running['step']>('plan');
  const attemptLimit = useAtLimit('attempts');
  // The image month is full: no image is asked for until it comes back.
  const monthFull = useAtLimit('newImages') === 'images_month';
  const monthFullRef = useRef(monthFull);
  monthFullRef.current = monthFull;
  // The start of the owner's day, once the section has cleared what came
  // before it: only attempts made since then are shown.
  const [start, setStart] = useState<Date | null>(null);
  const startRef = useRef<Date | null>(null);
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
  // The suggestion opened from its tile (docs/specs/platform/friendlier-home),
  // and each tile, so focus goes back to the one it came from.
  const [open, setOpen] = useState<{ batchId: string; postId: string } | null>(null);
  const tiles = useRef(new Map<string, HTMLButtonElement>());
  const pushed = useRef(false);
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
      const from = startRef.current;
      const today = from ? batchesRef.current.filter((b) => new Date(b.createdAt) >= from) : [];
      const run = await resumeImages(ownerId, today, onImageEvent);
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
        if (planned && imagesOn && !monthFullRef.current) {
          makeImages(
            event.batch,
            event.batch.posts.map((p) => p.id),
          );
        }
      } else if (event.type === 'error') {
        setErrorStep(stepRef.current ?? 'plan');
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
      const from = dayStart(new Date());
      await clearBefore(ownerId, from);
      const saved = await loadBatches(ownerId);
      const savedImages = await loadImages(ownerId);
      if (!active) return;
      batchesRef.current = saved;
      startRef.current = from;
      setStart(from);
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

  // The owner's last change to the offer, and its write to the phone: a load
  // started before a change never overrides it.
  const offerChanges = useRef(0);
  const offerWrite = useRef<Promise<void>>(Promise.resolve());

  // A treatment renamed or removed leaves the offer; yesterday's offer is gone.
  useEffect(() => {
    let current = true;
    const at = offerChanges.current;
    void (async () => {
      await offerWrite.current;
      const record = await loadOffer(ownerId, profile, new Date());
      if (current && offerChanges.current === at) setOffer(record);
    })();
    return () => {
      current = false;
    };
  }, [ownerId, profile]);

  function keepOffer(answers: OfferAnswers) {
    const made = toOffer(answers, new Date());
    if (!made) return;
    const record = { ownerId, answers, offer: made, createdAt: new Date().toISOString() };
    offerChanges.current += 1;
    setOffer(record);
    setOfferOpen(false);
    offerWrite.current = saveOffer(record);
  }

  function removeOffer() {
    offerChanges.current += 1;
    setOffer(null);
    offerWrite.current = clearOffer(ownerId);
  }

  function make() {
    // An app left open across the reset starts the new day here, so the new
    // attempt is numbered like the bar counts (docs/specs/platform/one-daily-reset).
    const from = dayStart(new Date());
    let todays = offer;
    if (startRef.current && from > startRef.current) {
      startRef.current = from;
      setStart(from);
      void clearBefore(ownerId, from);
      if (offer && new Date(offer.createdAt) < from) {
        todays = null;
        removeOffer();
      }
    }
    const run = startPlan(
      { ownerId, profile, recent: recentPosts(batches), offer: todays?.offer },
      onEvent,
    );
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
      posts: current.posts.map((p) =>
        p.id === postId ? applyEdit(p, edit, profile, current.offer) : p,
      ),
    };
    batchesRef.current = batchesRef.current.map((b) => (b.id === batchId ? next : b));
    setBatches(batchesRef.current);
    void saveBatch(next);
  }

  // A step done in the sheet, kept on the phone with the attempt.
  function taken(batchId: string, postId: string, step: TakenStep) {
    const current = batchesRef.current.find((b) => b.id === batchId);
    if (!current) return;
    const next = markTaken(current, postId, step, new Date().toISOString());
    batchesRef.current = batchesRef.current.map((b) => (b.id === batchId ? next : b));
    setBatches(batchesRef.current);
    void saveBatch(next);
  }

  // The back gesture closes the sheet: opening it adds a history entry.
  function openSuggestion(batchId: string, postId: string) {
    setOpen({ batchId, postId });
    window.history.pushState({ suggestion: true }, '');
    pushed.current = true;
  }

  const closeSuggestion = useCallback(() => {
    setOpen(null);
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPop = () => {
      pushed.current = false;
      setOpen(null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [open]);

  const cta = ctaFor(profile);
  // A new WhatsApp number: the text copied before held the old one, so its
  // posts lose "copied" on screen too (the store's applyCta did it there).
  useEffect(() => {
    if (!cta) return;
    const stale = batches.some((b) => b.posts.some((p) => p.cta !== cta && p.copiedAt));
    if (!stale) return;
    batchesRef.current = batches.map((b) => ({
      ...b,
      posts: b.posts.map((p) => {
        if (p.cta === cta || !p.copiedAt) return p;
        const { copiedAt: _copied, ...rest } = p;
        return { ...rest, cta };
      }),
    }));
    setBatches(batchesRef.current);
  }, [cta, batches]);

  const busy = running !== null || resuming || imagesResuming || making.size > 0;
  const currentHash = profileHash(profile);
  // Today's attempts, newest on top; older kept records only feed `recent`.
  const shown = useMemo(
    () =>
      start
        ? batches
            .filter((batch) => new Date(batch.createdAt) >= start)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        : [],
    [batches, start],
  );
  const numbers = attemptNumbers(shown);
  const newest = newestBatch(shown);
  const behind = newest ? staleUnedited(newest, profile) : [];
  // The newest batch's update is on its way: waiting for the search, the
  // images or the tab, or running.
  const updating = behind.length > 0 && (triedHash !== currentHash || running?.step === 'rewrite');
  // While the update waits for the search, nothing else starts: one rewrite
  // against the final details, and the waiting batch stays the newest.
  const waiting = searching && behind.length > 0;
  const held = busy || waiting;

  // The opened suggestion left the screen: the sheet closes with it.
  const openBatch = open ? shown.find((b) => b.id === open.batchId) : undefined;
  const openPost = open ? openBatch?.posts.find((p) => p.id === open.postId) : undefined;
  useEffect(() => {
    if (open && !openPost) closeSuggestion();
  }, [open, openPost, closeSuggestion]);

  // Opening the tab again lets a failed update try once more.
  useEffect(() => {
    if (active && !wasActive.current) setTriedHash(null);
    wasActive.current = active;
  }, [active]);

  useEffect(() => {
    if (!active || searching || busy || triedHash === currentHash) return;
    const next = autoRewrite(shown, profile);
    if (!next) return;
    setTriedHash(currentHash);
    update(next.batch, next.postIds);
  }, [active, searching, busy, triedHash, currentHash, shown, profile, update]);

  // An attempt with no image made or being made: "Make the images" stands
  // for all six, above its grid.
  function needsImagesFor(batch: PostBatch): boolean {
    return (
      imagesOn &&
      !monthFull &&
      !batch.posts.some((p) => {
        const key = imageKey(batch.id, p.id);
        return images.has(key) || making.has(key);
      })
    );
  }

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
    else if (!saved && !making.has(key) && monthFull) state = { kind: 'month' };
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
      {offer ? (
        <OfferLine offer={offer.offer} onOpen={() => setOfferOpen(true)} onRemove={removeOffer} />
      ) : (
        <button
          type="button"
          onClick={() => setOfferOpen(true)}
          className="press min-h-11 self-start rounded-control border border-accent bg-field px-4 text-[15px] text-accent-tint-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {t('offer.add')}
        </button>
      )}
      <OfferSheet
        open={offerOpen}
        onOpenChange={setOfferOpen}
        treatments={profile.offerings.map((o) => o.name)}
        answers={offer?.answers ?? DEFAULT_ANSWERS}
        onDone={keepOffer}
        onAddTreatments={() => {
          setOfferOpen(false);
          onAddTreatments?.();
        }}
      />
      <Button type="button" onClick={make} disabled={!cta || held || attemptLimit !== null}>
        {shown.length > 0 ? t('makeMore') : t('make')}
      </Button>
      {shown.length > 0 && (
        <p className="text-[13px] text-ink-secondary">
          {t('moreBelow', { n: numbers.get(shown[0].id) ?? shown.length })}
        </p>
      )}
      {!cta && <p className="text-[13px] text-error">{brand('panel.warnWhatsapp')}</p>}
      {(busy || updating) && <p className="text-[13px] text-ink-secondary">{t('keepOpen')}</p>}
      {error && (
        <p
          role="alert"
          className="rounded-control border border-error px-4 py-3 text-[15px] text-error"
        >
          {isUsageCode(error) ? (
            <UsageMessage code={error} action={errorStep === 'plan' ? 'attempts' : 'rewrites'} />
          ) : (
            t(`errors.${error}`)
          )}
        </p>
      )}
      {attemptLimit && !isUsageCode(error) && (
        <p className="text-[13px] text-error">
          <UsageMessage code={attemptLimit} action="attempts" />
        </p>
      )}
      {start && shown.length === 0 && running?.step !== 'plan' && (
        <p className="rounded-control border border-dashed border-edge px-4 py-4 text-center text-[15px] text-ink-secondary">
          {imagesOn ? t('empty') : t('emptyTextOnly')}
        </p>
      )}
      {running?.step === 'plan' && (
        <>
          <AttemptHeading n={shown.length + 1} count={running.posts.length} />
          {/* Still streaming in: shown, not opened until the attempt is kept. */}
          <div className={GRID}>
            {running.posts.map((post, index) => (
              <SuggestionTile
                key={post.id}
                post={post}
                n={index + 1}
                count={running.posts.length}
                image={imagesOn ? { kind: 'none' } : { kind: 'off' }}
                textOnly={!imagesOn}
                taken={null}
                check={false}
                onOpen={() => {}}
                disabled
              />
            ))}
          </div>
        </>
      )}
      {shown.map((batch) => {
        const needsImages = needsImagesFor(batch);
        const isNewest = batch === newest;
        const stale = isNewest && !updating ? behind : [];
        return (
          <div key={batch.id} className="flex flex-col gap-3">
            <AttemptHeading n={numbers.get(batch.id) ?? 1} count={batch.posts.length} />
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
            <div data-testid="attempt-grid" className={GRID}>
              {batch.posts.map((post, index) => (
                <SuggestionTile
                  key={post.id}
                  ref={(el) => {
                    // Post ids repeat across attempts: key by both.
                    const key = imageKey(batch.id, post.id);
                    if (el) tiles.current.set(key, el);
                    else tiles.current.delete(key);
                  }}
                  post={post}
                  n={index + 1}
                  count={batch.posts.length}
                  image={imageOf(post, batch, needsImages).state}
                  textOnly={
                    noImage(imageOf(post, batch, needsImages).state) &&
                    imageOf(post, batch, needsImages).state.kind !== 'month'
                  }
                  taken={takenLabel(post, !noImage(imageOf(post, batch, needsImages).state))}
                  check={flagsFor(post, batch, profile, isNewest).some((flag) =>
                    SHOWN_FLAGS.includes(flag.kind),
                  )}
                  offer={post.offer ? batch.offer : undefined}
                  onOpen={() => openSuggestion(batch.id, post.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
      {openBatch && openPost && (
        <SuggestionSheet
          key={`${openBatch.id}-${openPost.id}`}
          title={t('sheetTitle', {
            attempt: numbers.get(openBatch.id) ?? 1,
            n: openBatch.posts.indexOf(openPost) + 1,
            count: openBatch.posts.length,
          })}
          onClose={closeSuggestion}
          onCloseFocus={() => tiles.current.get(imageKey(openBatch.id, openPost.id))?.focus()}
          actions={
            <TakeAway
              post={openPost}
              cta={cta ?? openPost.cta}
              image={
                making.has(imageKey(openBatch.id, openPost.id))
                  ? undefined
                  : images.get(imageKey(openBatch.id, openPost.id))
              }
              imagesOn={imagesOn}
              name={profile.name.value}
              createdAt={openBatch.createdAt}
              attempt={numbers.get(openBatch.id) ?? 1}
              n={openBatch.posts.indexOf(openPost) + 1}
              onTaken={(step) => taken(openBatch.id, openPost.id, step)}
            />
          }
        >
          <PostCard
            post={openPost}
            offer={openPost.offer ? openBatch.offer : undefined}
            cta={cta ?? openPost.cta}
            onSave={(edit) => saveEdit(openBatch.id, openPost.id, edit)}
            image={imageOf(openPost, openBatch, needsImagesFor(openBatch))}
            flags={flagsFor(openPost, openBatch, profile, openBatch === newest)}
            onRewrite={
              openBatch === newest && openPost.edited && isPostStale(openPost, openBatch, profile)
                ? () => update(openBatch, [openPost.id])
                : undefined
            }
            busy={held}
            editBusy={running !== null || resuming || waiting}
            translation={
              <CaptionTranslation
                key={openPost.caption}
                ownerId={ownerId}
                batchId={openBatch.id}
                postId={openPost.id}
                caption={openPost.caption}
              />
            }
          />
        </SuggestionSheet>
      )}
    </section>
  );
}

const GRID = 'grid grid-cols-3 gap-x-2 gap-y-3';

function AttemptHeading({ n, count }: { n: number; count: number }) {
  const t = useTranslations('posts');
  return (
    <div className="mt-3 flex items-baseline justify-between gap-2 border-t border-edge pt-4">
      <h2 className="text-[17px] font-medium tracking-[-0.01em]">{t('attempt', { n })}</h2>
      <span className="text-[13px] text-ink-secondary">{t('attemptCount', { count })}</span>
    </div>
  );
}

// No image to save for this suggestion, so the text alone ticks it: images
// off, paused, or the month full (docs/specs/platform/friendlier-home). A
// month-full tile still shows its block, saying until when.
function noImage(state: ImageState): boolean {
  if (state.kind === 'off' || state.kind === 'month') return true;
  return state.kind === 'failed' && (state.code === 'images_paused' || state.code === 'images_off');
}

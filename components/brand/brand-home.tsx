'use client';

import { ChatText, ImageSquare, Storefront, WarningCircle } from '@phosphor-icons/react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ReviewsSection } from '@/components/reviews/reviews-section';
import { Welcome } from '@/components/screen-text';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { UsageBar } from '@/components/usage/usage-bar';
import { UsageMessage } from '@/components/usage/usage-message';
import { useAtLimit } from '@/components/usage/usage-provider';
import { lastReadLabel } from '@/lib/brand/display';
import { changedUnsourced, countOwnerEdits, type SectionId } from '@/lib/brand/edit';
import { type FieldKey, missingFields } from '@/lib/brand/missing';
import type { BrandErrorCode, PartialProfile, Profile } from '@/lib/brand/profile';
import { type ReadEvent, type RunningRead, resumeRead, startRead } from '@/lib/brand/read-client';
import type { SearchAnswer } from '@/lib/brand/search/run';
import { mergeSearch, needsSearch, requestSearch } from '@/lib/brand/search-client';
import {
  forgetBrand,
  loadBrand,
  mergeSearchIntoStore,
  requestPersistence,
  saveBrand,
} from '@/lib/brand/store';
import { holdWakeLock } from '@/lib/brand/wake-lock';
import { ctaFor } from '@/lib/posts/input';
import { applyCta } from '@/lib/posts/store';
import { isUsageCode, type UsageCode } from '@/lib/usage/codes';
import { PostsSection } from '../posts/posts-section';
import { type HomeTab, HomeTabBar } from './home-tab-bar';
import { MissingBlock } from './missing-block';
import { BrandPanel, type SearchState } from './panel';
import { Reading } from './reading';
import { SectionSheet } from './section-sheet';

// The home screen (docs/specs/brand/brand-panel, "The home screen"): no
// business yet, reading, or the panel. Everything is kept on the phone. With
// the panel come three tabs, "Your business", "Create Posts"
// (docs/specs/platform/home-tabs) and "Reviews" (docs/specs/reviews/reply-drafts):
// the app opens on the posts, and a read of any kind comes back to the business.

type View =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'reading'; url: string; partial: PartialProfile }
  | { kind: 'panel' };

type Notice = 'invalidSaved' | 'notKept' | null;

export function BrandHome({
  ownerId,
  name,
  imagesOn,
}: {
  ownerId: string;
  name: string;
  imagesOn: boolean;
}) {
  const t = useTranslations('brand');
  // Read by the load callbacks, so a language change doesn't run the load
  // again (a second search, a reload of the brand).
  const tRef = useRef(t);
  tRef.current = t;
  const home = useTranslations('home');
  const locale = useLocale();
  const [view, setView] = useState<View>({ kind: 'loading' });
  // Not remembered: every open lands on "Create Posts".
  const [tab, setTab] = useState<HomeTab>('posts');
  const [saved, setSaved] = useState<Profile | null>(null);
  const [ownerEdited, setOwnerEdited] = useState<string[]>([]);
  const [url, setUrl] = useState('');
  const [error, setError] = useState<BrandErrorCode | UsageCode | 'offline' | null>(null);
  const readLimit = useAtLimit('reads');
  // The server's refusal already says it; the line under the button doesn't
  // repeat it.
  const readLimitLine = readLimit && !isUsageCode(error) && (
    <p className="mt-2 text-[13px] text-error">
      <UsageMessage code={readLimit} action="reads" />
    </p>
  );
  const [notice, setNotice] = useState<Notice>(null);
  const [editing, setEditing] = useState<SectionId | null>(null);
  // The field "+ Phone" and the like open their section's form on.
  const [focusField, setFocusField] = useState<FieldKey | null>(null);
  const [confirm, setConfirm] = useState<'reread' | 'forget' | null>(null);
  const [announce, setAnnounce] = useState('');
  const field = useRef<HTMLInputElement>(null);
  const running = useRef<RunningRead | null>(null);
  const lock = useRef<{ release(): void } | null>(null);
  const savedRef = useRef<Profile | null>(null);
  savedRef.current = saved;
  const [search, setSearch] = useState<SearchState>(null);
  // The one essence search in flight, and an answer waiting for the "Your
  // feeling" sheet to close (docs/specs/brand/search-essence).
  const searching = useRef<AbortController | null>(null);
  const pending = useRef<SearchAnswer | null>(null);
  const editingRef = useRef<SectionId | null>(null);
  editingRef.current = editing;
  const ownerEditedRef = useRef<string[]>([]);
  ownerEditedRef.current = ownerEdited;

  // Merges a waiting answer into the profile as stored now, which may hold
  // edits made since the search left, here or in another tab.
  const applySearch = useCallback(async () => {
    const answer = pending.current;
    const base = savedRef.current;
    if (!answer || !base) return;
    pending.current = null;
    let merged: Profile;
    try {
      const record = await mergeSearchIntoStore(ownerId, answer);
      if (record) {
        merged = record.profile;
        setOwnerEdited(record.ownerEdited);
      } else {
        // No store on this phone: the answer joins the profile on screen.
        merged = mergeSearch(base, answer);
      }
    } catch {
      setSearch('failed');
      return;
    }
    setSaved(merged);
    const found = answer.searchTerms.length + answer.moments.length + answer.placeSymbols.length;
    setSearch(found === 0 ? 'empty' : null);
  }, [ownerId]);

  const startSearch = useCallback(
    (profile: Profile) => {
      if (searching.current || !needsSearch(profile)) return;
      const controller = new AbortController();
      searching.current = controller;
      setSearch('running');
      // One tab at a time searches for an owner; a tab that can't take the
      // lock leaves it to the one that holds it.
      const run = async () => {
        try {
          const outcome = await requestSearch(profile, {
            fetch: (...args) => globalThis.fetch(...args),
            signal: controller.signal,
          });
          if (controller.signal.aborted) return;
          if (outcome.kind === 'signedOut') {
            window.location.assign('/enter');
          } else if (outcome.kind === 'error') {
            setSearch(outcome.code === 'search_unavailable' ? null : 'failed');
          } else {
            pending.current = outcome.answer;
            if (editingRef.current !== 'feeling') await applySearch();
          }
        } catch {
          // Stopped by a re-read or a forget.
        } finally {
          if (searching.current === controller) searching.current = null;
        }
      };
      const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
      if (!locks) {
        void run();
        return;
      }
      void locks.request(`brand-search:${ownerId}`, { ifAvailable: true }, async (lock) => {
        if (lock) {
          await run();
        } else {
          if (searching.current === controller) searching.current = null;
          setSearch(null);
        }
      });
    },
    [applySearch, ownerId],
  );

  const stopSearch = useCallback(() => {
    searching.current?.abort();
    searching.current = null;
    pending.current = null;
    setSearch(null);
  }, []);

  // An answer that came while the feeling sheet was open, or before the
  // profile it joins was on screen, is merged once both are ready.
  useEffect(() => {
    if (saved && editing !== 'feeling') void applySearch();
  }, [saved, editing, applySearch]);

  const endRead = useCallback(() => {
    lock.current?.release();
    lock.current = null;
    running.current = null;
  }, []);

  const onEvent = useCallback(
    (event: ReadEvent) => {
      if (event.type === 'partial') {
        setView((v) => (v.kind === 'reading' ? { ...v, partial: event.profile } : v));
      } else if (event.type === 'final') {
        endRead();
        setSaved(event.profile);
        setOwnerEdited([]);
        setError(null);
        setNotice(event.kept ? null : 'notKept');
        setView({ kind: 'panel' });
        setAnnounce(tRef.current('home.announceDone'));
        if (event.kept) void requestPersistence();
        startSearch(event.profile);
      } else if (event.type === 'error') {
        endRead();
        setError(event.code);
        setView({ kind: savedRef.current ? 'panel' : 'empty' });
      } else if (event.type === 'offline') {
        // The read waits for the owner to come back: let the screen sleep.
        lock.current?.release();
        lock.current = null;
        setError('offline');
      } else {
        window.location.assign('/enter');
      }
    },
    [endRead, startSearch],
  );

  const begin = useCallback((read: RunningRead, readUrl: string) => {
    running.current = read;
    lock.current ??= holdWakeLock();
    setError(null);
    setTab('business');
    setView({ kind: 'reading', url: readUrl, partial: {} });
    setAnnounce(tRef.current('home.announceReading'));
  }, []);

  const tryResume = useCallback(async () => {
    const read = await resumeRead(ownerId, onEvent);
    if (read) begin(read, read.url);
  }, [ownerId, onEvent, begin]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const result = await loadBrand(ownerId);
      if (!active) return;
      if (result.kind === 'saved') {
        setSaved(result.record.profile);
        setOwnerEdited(result.record.ownerEdited);
        setView({ kind: 'panel' });
        startSearch(result.record.profile);
      } else {
        setNotice(result.kind === 'invalid' ? 'invalidSaved' : null);
        setView({ kind: 'empty' });
      }
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
    };
  }, [ownerId, tryResume, startSearch]);

  function read(event: React.FormEvent) {
    event.preventDefault();
    const typed = url.trim();
    if (!typed) {
      field.current?.focus();
      return;
    }
    begin(startRead({ ownerId, url: typed, reread: false }, onEvent), typed);
  }

  function reread() {
    if (!saved) return;
    setConfirm(null);
    stopSearch();
    begin(startRead({ ownerId, url: saved.siteUrl, reread: true }, onEvent), saved.siteUrl);
  }

  function stop() {
    running.current?.stop();
    endRead();
    setError(null);
    setView({ kind: savedRef.current ? 'panel' : 'empty' });
  }

  async function forget() {
    setConfirm(null);
    stopSearch();
    // The posts section closes first, which stops its run, so nothing it
    // was making is saved after the delete.
    setView({ kind: 'empty' });
    setSaved(null);
    setOwnerEdited([]);
    setUrl('');
    setNotice(null);
    setError(null);
    await forgetBrand(ownerId);
  }

  async function saveEdit(profile: Profile) {
    const edited = saved
      ? [...new Set([...ownerEdited, ...changedUnsourced(saved, profile)])]
      : ownerEdited;
    const kept = await saveBrand(ownerId, profile, new Date(), edited);
    // A WhatsApp edit reaches every post's call to action, with no model call.
    const cta = ctaFor(profile);
    if (kept && cta) await applyCta(ownerId, cta);
    setSaved(profile);
    setOwnerEdited(edited);
    if (!kept) setNotice('notKept');
    setEditing(null);
  }

  const edits = saved ? countOwnerEdits(saved, ownerEdited) : 0;
  const message = (text: React.ReactNode, tone: 'error' | 'note') => (
    <p
      role={tone === 'error' ? 'alert' : 'note'}
      className={
        tone === 'error'
          ? 'mb-4 rounded-control border border-error px-4 py-3 text-[15px] text-error'
          : 'mb-4 rounded-control bg-accent-tint px-4 py-3 text-[15px] text-accent-tint-ink'
      }
    >
      {text}
    </p>
  );
  // 1.2's two warnings, above the missing block on "Your business": each is
  // the button for its field, opening its section's form on it.
  const warning = (text: string, section: SectionId, field: FieldKey) => (
    <button
      type="button"
      onClick={() => {
        setFocusField(field);
        setEditing(section);
      }}
      className="press flex min-h-11 items-start gap-1.5 rounded-control py-2 text-left text-[15px] leading-normal text-error outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <WarningCircle aria-hidden className="mt-1 shrink-0" size={16} />
      {text}
    </button>
  );

  return (
    <div className={view.kind === 'empty' ? 'flex flex-col' : 'mt-6 flex flex-col'}>
      {/* Only before a business is saved: then the header's name says it. */}
      {view.kind === 'empty' && (
        <div className="mb-6">
          <Welcome name={name} />
        </div>
      )}
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
      {error &&
        message(
          isUsageCode(error) ? <UsageMessage code={error} action="reads" /> : t(`errors.${error}`),
          'error',
        )}
      {notice && message(t(`home.${notice}`), 'note')}

      {view.kind === 'empty' && (
        <form onSubmit={read} noValidate className="flex flex-col">
          <Label htmlFor="website" className="mb-1.5">
            {home('websiteLabel')}
          </Label>
          <Input
            ref={field}
            id="website"
            type="url"
            inputMode="url"
            autoComplete="url"
            autoCapitalize="none"
            placeholder={t('home.placeholder')}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Button type="submit" className="mt-3" disabled={readLimit !== null}>
            {t('home.read')}
          </Button>
          {readLimitLine}
          <p className="mt-2 text-xs text-ink-secondary">{t('home.readHint')}</p>
        </form>
      )}

      {view.kind === 'reading' && (
        <>
          <Reading url={view.url} onStop={stop} />
          <BrandPanel profile={view.partial} editable={false} onEdit={() => {}} />
        </>
      )}

      {view.kind === 'panel' && saved && (
        // Room under the last line for the bottom bar.
        <Tabs value={tab} onValueChange={(value) => setTab(value as HomeTab)} className="pb-24">
          <HomeTabBar
            label={home('tabs.label')}
            tabs={[
              { value: 'business', label: home('tabs.business'), icon: Storefront },
              { value: 'posts', label: home('tabs.posts'), icon: ImageSquare },
              { value: 'reviews', label: home('tabs.reviews'), icon: ChatText },
            ]}
          />
          <TabsContent value="business" hidden={tab !== 'business'}>
            <UsageBar tab="business" />
            {/* What's missing first (docs/specs/platform/friendlier-home). */}
            <h2 className="mt-5 text-[22px] leading-tight font-medium tracking-[-0.01em]">
              {t('home.title', { name: saved.name.value })}
            </h2>
            <p className="mt-1 text-[14px] leading-normal text-ink-secondary">
              {t('home.subtitle')}
            </p>
            <div className="mt-4 flex flex-col gap-3">
              {saved.thin && message(t('panel.thin'), 'note')}
              {!saved.contact.whatsapp?.value?.trim() &&
                warning(t('panel.warnWhatsapp'), 'contact', 'whatsapp')}
              {!saved.location.town?.value?.trim() && warning(t('panel.warnTown'), 'place', 'town')}
              <MissingBlock
                {...missingFields(saved, search)}
                onAdd={({ section, field }) => {
                  setFocusField(field);
                  setEditing(section);
                }}
              />
              <BrandPanel
                profile={saved}
                editable
                onEdit={(section) => {
                  setFocusField(null);
                  setEditing(section);
                }}
                ownerEdited={ownerEdited}
                search={search}
                mode="home"
              />
            </div>
            <div className="mt-5 flex flex-col gap-1">
              <p className="text-[13px] leading-normal text-ink-secondary">
                {t('home.readFrom', {
                  site: siteLabel(saved.siteUrl),
                  when: lastReadLabel(saved.readAt, new Date(), locale),
                })}
              </p>
              <div className="flex flex-wrap gap-x-6">
                <button
                  type="button"
                  onClick={() => (edits > 0 ? setConfirm('reread') : reread())}
                  disabled={readLimit !== null}
                  className="min-h-11 text-[15px] font-medium text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
                >
                  {t('home.reread')}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirm('forget')}
                  className="min-h-11 text-[15px] font-medium text-error outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {t('home.forget')}
                </button>
              </div>
              {readLimitLine}
            </div>
            <SectionSheet
              profile={saved}
              section={editing}
              focus={focusField}
              onSave={saveEdit}
              onClose={() => setEditing(null)}
            />
            <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
              <AlertDialogContent>
                {confirm === 'reread' ? (
                  <>
                    <AlertDialogTitle>{t('reread.title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('reread.body', { count: edits })}
                    </AlertDialogDescription>
                    <div className="flex gap-2">
                      <AlertDialogCancel>{t('reread.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={reread}>{t('reread.confirm')}</AlertDialogAction>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertDialogTitle>
                      {t('forget.title', { name: saved.name.value })}
                    </AlertDialogTitle>
                    <AlertDialogDescription>{t('forget.body')}</AlertDialogDescription>
                    <div className="flex gap-2">
                      <AlertDialogCancel>{t('forget.cancel')}</AlertDialogCancel>
                      <AlertDialogAction destructive onClick={() => void forget()}>
                        {t('forget.confirm')}
                      </AlertDialogAction>
                    </div>
                  </>
                )}
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>
          <TabsContent value="posts" hidden={tab !== 'posts'}>
            <UsageBar tab="posts" />
            <PostsSection
              ownerId={ownerId}
              profile={saved}
              imagesOn={imagesOn}
              active={tab === 'posts'}
              searching={search === 'running'}
              onAddTreatments={() => {
                setFocusField('offerings');
                setEditing('business');
                setTab('business');
              }}
            />
          </TabsContent>
          <TabsContent value="reviews" hidden={tab !== 'reviews'}>
            <UsageBar tab="reviews" />
            <ReviewsSection ownerId={ownerId} profile={saved} active={tab === 'reviews'} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// `https://sendanangmassage.com/` → `sendanangmassage.com`.
function siteLabel(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

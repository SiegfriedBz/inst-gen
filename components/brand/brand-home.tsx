'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { lastReadLabel } from '@/lib/brand/display';
import { countOwnerEdits, type SectionId } from '@/lib/brand/edit';
import type { BrandErrorCode, PartialProfile, Profile } from '@/lib/brand/profile';
import { type ReadEvent, type RunningRead, resumeRead, startRead } from '@/lib/brand/read-client';
import { forgetBrand, loadBrand, requestPersistence, saveBrand } from '@/lib/brand/store';
import { holdWakeLock } from '@/lib/brand/wake-lock';
import { BrandPanel } from './panel';
import { Reading } from './reading';
import { SectionSheet } from './section-sheet';

// The home screen (docs/specs/brand/brand-panel, "The home screen"): no
// business yet, reading, or the panel. Everything is kept on the phone.

type View =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'reading'; url: string; partial: PartialProfile }
  | { kind: 'panel' };

type Notice = 'invalidSaved' | 'notKept' | null;

export function BrandHome({ ownerId }: { ownerId: string }) {
  const t = useTranslations('brand');
  const home = useTranslations('home');
  const locale = useLocale();
  const [view, setView] = useState<View>({ kind: 'loading' });
  const [saved, setSaved] = useState<Profile | null>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState<BrandErrorCode | 'offline' | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [editing, setEditing] = useState<SectionId | null>(null);
  const [confirm, setConfirm] = useState<'reread' | 'forget' | null>(null);
  const [announce, setAnnounce] = useState('');
  const field = useRef<HTMLInputElement>(null);
  const running = useRef<RunningRead | null>(null);
  const lock = useRef<{ release(): void } | null>(null);
  const savedRef = useRef<Profile | null>(null);
  savedRef.current = saved;

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
        setError(null);
        setNotice(event.kept ? null : 'notKept');
        setView({ kind: 'panel' });
        setAnnounce(t('home.announceDone'));
        if (event.kept) void requestPersistence();
      } else if (event.type === 'error') {
        endRead();
        setError(event.code);
        setView({ kind: savedRef.current ? 'panel' : 'empty' });
      } else if (event.type === 'offline') {
        setError('offline');
      } else {
        window.location.assign('/enter');
      }
    },
    [endRead, t],
  );

  const begin = useCallback(
    (read: RunningRead, readUrl: string) => {
      running.current = read;
      lock.current ??= holdWakeLock();
      setError(null);
      setView({ kind: 'reading', url: readUrl, partial: {} });
      setAnnounce(t('home.announceReading'));
    },
    [t],
  );

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
        setView({ kind: 'panel' });
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
  }, [ownerId, tryResume]);

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
    await forgetBrand(ownerId);
    setSaved(null);
    setUrl('');
    setNotice(null);
    setError(null);
    setView({ kind: 'empty' });
  }

  async function saveEdit(profile: Profile) {
    const kept = await saveBrand(ownerId, profile);
    setSaved(profile);
    if (!kept) setNotice('notKept');
    setEditing(null);
  }

  const edits = saved ? countOwnerEdits(saved) : 0;
  const message = (text: string, tone: 'error' | 'note') => (
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

  return (
    <div className="mt-6 flex flex-col">
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
      {error && message(t(`errors.${error}`), 'error')}
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
          <Button type="submit" className="mt-3">
            {t('home.read')}
          </Button>
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
        <>
          <p className="mb-4 text-[15px] leading-normal text-ink-secondary">
            {t('home.intro', { name: saved.name.value })}
          </p>
          <BrandPanel profile={saved} editable onEdit={setEditing} />
          <p className="mt-4 text-[13px] text-ink-secondary">{t('home.postsSoon')}</p>
          <div className="mt-6 flex flex-col gap-2 border-t border-edge pt-4">
            <p className="truncate text-[15px]">{saved.siteUrl}</p>
            <p className="text-[13px] text-ink-secondary">
              {t('home.lastRead', { when: lastReadLabel(saved.readAt, new Date(), locale) })}
            </p>
            <button
              type="button"
              onClick={() => (edits > 0 ? setConfirm('reread') : reread())}
              className="press mt-2 inline-flex h-12 w-full items-center justify-center rounded-control border border-edge px-4 text-[15px] font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
          <SectionSheet
            profile={saved}
            section={editing}
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
        </>
      )}
    </div>
  );
}

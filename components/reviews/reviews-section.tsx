'use client';

import { useLocale, useTranslations } from 'next-intl';
import { RadioGroup } from 'radix-ui';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UsageMessage } from '@/components/usage/usage-message';
import { useAtLimit } from '@/components/usage/usage-provider';
import type { Profile } from '@/lib/brand/profile';
import { dayStart } from '@/lib/posts/day';
import { requestReplies } from '@/lib/reviews/client';
import { fillName } from '@/lib/reviews/name';
import { REPLY_LIMITS, type ReplyErrorCode, type ScreenLocale } from '@/lib/reviews/reply';
import { clearReview, loadReview, type ReviewRecord, saveReview } from '@/lib/reviews/store';
import { isUsageCode, type UsageCode } from '@/lib/usage/codes';
import { ReplyCard } from './reply-card';

const LINK =
  'inline-flex min-h-11 items-center text-[15px] font-medium text-accent underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60';

type Failure = ReplyErrorCode | UsageCode | 'offline';

// The review's language, named in the screen's; the code when the browser
// can't name it.
function languageName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}

// "Reviews" (docs/specs/reviews/reply-drafts): paste a Google Maps review and
// the guest's name, get a short and a warmer reply in the guest's language,
// with translations in the owner's. Only the current review is kept, until a
// new one or Google's reset (docs/specs/platform/one-daily-reset).
// Storage that fails (a full phone) keeps nothing; the tab still works.
async function keep(work: Promise<void>): Promise<void> {
  try {
    await work;
  } catch {}
}

export function ReviewsSection({
  ownerId,
  profile,
  active,
}: {
  ownerId: string;
  profile: Profile;
  // The tab is showing: a review from before today's reset goes, even in an
  // app left open across it.
  active: boolean;
}) {
  const t = useTranslations('reviews');
  const locale = useLocale() as ScreenLocale;
  const id = useId();
  const [name, setName] = useState('');
  const [review, setReview] = useState('');
  const [record, setRecord] = useState<ReviewRecord | null>(null);
  // The reply shown (docs/specs/platform/friendlier-home): Short first for each
  // new review, kept through "Write 2 other replies", never stored.
  const [which, setWhich] = useState<'short' | 'warm'>('short');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Failure | null>(null);
  const replyLimit = useAtLimit('replies');
  // A double tap must not send twice: state updates too late for that.
  const sending = useRef(false);

  useEffect(() => {
    let live = true;
    void loadReview(ownerId, new Date())
      .catch(() => null)
      .then((saved) => {
        if (!live) return;
        setRecord(saved);
        setLoaded(true);
      });
    return () => {
      live = false;
    };
  }, [ownerId]);

  useEffect(() => {
    if (!active || !record || new Date(record.createdAt) >= dayStart(new Date())) return;
    setRecord(null);
    setName('');
    setReview('');
    setError(null);
    void keep(clearReview(ownerId));
  }, [active, record, ownerId]);

  async function write(input: { name: string; review: string; again: boolean }) {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError(null);
    const out = await requestReplies({
      review: input.review,
      name: input.name,
      locale,
      profile,
      avoid: input.again && record ? [record.answer.short.text, record.answer.warm.text] : null,
    });
    sending.current = false;
    setBusy(false);
    if (!out.ok) {
      if (out.code === 'signedOut') window.location.assign('/enter');
      else setError(out.code);
      return;
    }
    const next: ReviewRecord = {
      ownerId,
      name: input.name.trim(),
      review: input.review.trim(),
      locale,
      answer: out.answer,
      edits: { short: null, warm: null },
      createdAt: new Date().toISOString(),
    };
    if (!input.again) setWhich('short');
    setRecord(next);
    await keep(saveReview(next));
  }

  async function saveEdit(which: 'short' | 'warm', text: string) {
    if (!record) return;
    const next = { ...record, edits: { ...record.edits, [which]: text } };
    setRecord(next);
    await keep(saveReview(next));
  }

  async function startOver() {
    setRecord(null);
    setWhich('short');
    setName('');
    setReview('');
    setError(null);
    await keep(clearReview(ownerId));
  }

  const errorLine = error && (
    <p
      role="alert"
      className="rounded-control border border-error px-4 py-3 text-[15px] text-error"
    >
      {isUsageCode(error) ? <UsageMessage code={error} action="replies" /> : t(`errors.${error}`)}
    </p>
  );
  // At 0, the button is off and says when it comes back, unless the server's
  // refusal already says so.
  const limitLine = replyLimit && !isUsageCode(error) && (
    <p className="text-[13px] text-error">
      <UsageMessage code={replyLimit} action="replies" />
    </p>
  );

  if (!loaded) return null;

  if (!record) {
    return (
      <section className="mt-5 flex flex-col gap-4">
        <p className="text-[15px] leading-normal text-ink-secondary">{t('intro')}</p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-name`}>{t('nameLabel')}</Label>
          <Input
            id={`${id}-name`}
            autoComplete="off"
            maxLength={REPLY_LIMITS.name}
            disabled={busy}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-review`}>{t('reviewLabel')}</Label>
          <Textarea
            id={`${id}-review`}
            rows={7}
            maxLength={REPLY_LIMITS.review}
            disabled={busy}
            value={review}
            onChange={(e) => setReview(e.target.value)}
          />
        </div>
        <Button
          type="button"
          disabled={busy || review.trim() === '' || replyLimit !== null}
          onClick={() => void write({ name, review, again: false })}
        >
          {busy ? t('writing') : t('write')}
        </Button>
        {busy && <p className="text-[13px] text-ink-secondary">{t('keepOpen')}</p>}
        {limitLine}
        {errorLine}
      </section>
    );
  }

  const { answer } = record;
  const language = languageName(answer.reviewLanguage, locale);
  const shown = (text: string) => fillName(text, record.name);
  const edit = record.edits[which];
  const draft = answer[which];

  return (
    <section className="mt-5 flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-control bg-field-muted px-4 py-3">
        <h3 className="text-[13px] font-semibold text-ink-secondary">
          {record.name
            ? t('heading', { name: record.name, language })
            : t('headingNoName', { language })}
        </h3>
        <p className="whitespace-pre-line text-[15px] leading-normal">{record.review}</p>
        {answer.reviewTranslation && (
          <p
            data-translation
            className="whitespace-pre-line border-t border-edge/40 pt-2 text-[15px] leading-normal text-ink-secondary"
          >
            {shown(answer.reviewTranslation)}
          </p>
        )}
      </div>
      {answer.abusive && (
        <p className="rounded-control bg-accent-tint px-4 py-3 text-[15px] leading-normal text-accent-tint-ink">
          {t('abusive')}
        </p>
      )}
      <RadioGroup.Root
        aria-label={t('which')}
        value={which}
        onValueChange={(value) => setWhich(value as 'short' | 'warm')}
        className="grid grid-cols-2 gap-1 rounded-control border border-edge bg-field-muted p-1"
      >
        {(['short', 'warm'] as const).map((value) => (
          <RadioGroup.Item
            key={value}
            value={value}
            className="min-h-11 rounded-[9px] text-[15px] text-ink-secondary outline-none focus-visible:ring-2 focus-visible:ring-accent data-[state=checked]:bg-field data-[state=checked]:font-medium data-[state=checked]:text-accent-tint-ink data-[state=checked]:ring-1 data-[state=checked]:ring-accent"
          >
            {t(value)}
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
      <ReplyCard
        key={`${record.createdAt}-${which}`}
        title={t(which)}
        text={edit ?? shown(draft.text)}
        translation={draft.translation && shown(draft.translation)}
        edited={edit !== null}
        onSave={(text) => void saveEdit(which, text)}
        copyLabel={t('copy')}
      />
      <p className="text-[13px] text-ink-secondary">{t('howTo')}</p>
      {errorLine}
      <div className="flex flex-wrap justify-center gap-x-6">
        <button
          type="button"
          className={LINK}
          disabled={busy || replyLimit !== null}
          onClick={() => void write({ name: record.name, review: record.review, again: true })}
        >
          {busy ? t('writing') : t('again')}
        </button>
        {limitLine}
        <button type="button" className={LINK} disabled={busy} onClick={() => void startOver()}>
          {t('newReview')}
        </button>
      </div>
    </section>
  );
}

'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { ReplyCard } from '@/components/reviews/reply-card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UsageMessage } from '@/components/usage/usage-message';
import { useAtLimit } from '@/components/usage/usage-provider';
import type { Profile } from '@/lib/brand/profile';
import { dayStart } from '@/lib/posts/day';
import { requestAnswer } from '@/lib/questions/client';
import {
  type Guest,
  NO_GUEST,
  QUESTION_LIMITS,
  type QuestionErrorCode,
} from '@/lib/questions/question';
import {
  type ConversationRecord,
  clearConversation,
  loadConversation,
  saveConversation,
} from '@/lib/questions/store';
import type { ScreenLocale } from '@/lib/reviews/reply';
import { isUsageCode, type UsageCode } from '@/lib/usage/codes';

const LINK =
  'inline-flex min-h-11 items-center text-[15px] font-medium text-accent underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60';
const OUTLINE =
  'inline-flex min-h-11 w-full items-center justify-center rounded-control border border-edge px-4 text-[15px] font-medium text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60';
const NOTE =
  'rounded-control bg-accent-tint px-4 py-3 text-[15px] leading-normal text-accent-tint-ink';

type Failure = QuestionErrorCode | UsageCode | 'offline';

// The question's language, named in the screen's; the code when the browser
// can't name it (as the Reviews tab does).
function languageName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}

// Storage that fails (a full phone) keeps nothing; the tab still works.
async function keep(work: Promise<void>): Promise<void> {
  try {
    await work;
  } catch {}
}

const hasDetail = (known: Guest) =>
  known.place !== null || known.day !== null || known.time !== null;

// A conversation from before Google's reset is gone, even in an app left open
// across it (docs/specs/platform/one-daily-reset).
const isOld = (record: ConversationRecord) => new Date(record.updatedAt) < dayStart(new Date());

// "What this guest has told you": the booking details kept for the
// conversation, so a final answer asks only for what's missing
// (docs/specs/questions/answer-drafts).
function KnownBox({
  known,
  onReset,
  disabled = false,
}: {
  known: Guest;
  onReset?: () => void;
  // While an answer is written: it would come back with this guest's details.
  disabled?: boolean;
}) {
  const t = useTranslations('questions');
  if (!hasDetail(known)) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1 rounded-control bg-field-muted px-4 py-3">
        <h3 className="text-[13px] font-semibold text-ink-secondary">{t('known.title')}</h3>
        {known.place && (
          <p className="text-[15px] leading-normal">{t('known.place', { value: known.place })}</p>
        )}
        {known.day && (
          <p className="text-[15px] leading-normal">{t('known.day', { value: known.day })}</p>
        )}
        {known.time && (
          <p className="text-[15px] leading-normal">{t('known.time', { value: known.time })}</p>
        )}
      </div>
      {onReset && (
        <button type="button" className={OUTLINE} disabled={disabled} onClick={onReset}>
          {t('newConversation')}
        </button>
      )}
      <p className="text-[13px] text-ink-secondary">{t('known.hint')}</p>
    </div>
  );
}

// "Questions" (docs/specs/questions/answer-drafts): paste a guest's message,
// get one answer in the guest's language with its translation in the owner's.
// A final answer ends by asking the guest to book, for what they haven't told
// yet. Only the current conversation is kept, until a new one or Google's
// reset (docs/specs/platform/one-daily-reset).
export function QuestionsSection({
  ownerId,
  profile,
  active,
}: {
  ownerId: string;
  profile: Profile;
  // The tab is showing: a conversation from before today's reset goes, even
  // in an app left open across it.
  active: boolean;
}) {
  const t = useTranslations('questions');
  const locale = useLocale() as ScreenLocale;
  const id = useId();
  const [question, setQuestion] = useState('');
  const [final, setFinal] = useState(false);
  const [record, setRecord] = useState<ConversationRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Failure | null>(null);
  const limit = useAtLimit('answers');
  // A double tap must not send twice: state updates too late for that.
  const sending = useRef(false);

  useEffect(() => {
    let live = true;
    void loadConversation(ownerId, new Date())
      .catch(() => null)
      .then((saved) => {
        if (!live) return;
        setRecord(saved);
        setFinal(saved?.current?.final ?? false);
        setLoaded(true);
      });
    return () => {
      live = false;
    };
  }, [ownerId]);

  useEffect(() => {
    if (!active || !record || !isOld(record)) return;
    setRecord(null);
    setQuestion('');
    setFinal(false);
    setError(null);
    void keep(clearConversation(ownerId));
  }, [active, record, ownerId]);

  async function write(input: { question: string; again: boolean }) {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError(null);
    // An app left open across the reset starts the new day here: what the
    // guest told before it goes, and the answer with it; the question stays.
    let live = record;
    if (record && isOld(record)) {
      live = null;
      setRecord(null);
      setQuestion(input.question);
      await keep(clearConversation(ownerId));
    }
    const out = await requestAnswer({
      question: input.question,
      final,
      locale,
      profile,
      known: live?.known ?? NO_GUEST,
      // The answer as the model wrote it, never the owner's edit.
      avoid: input.again && live?.current ? live.current.answer.answer.text : null,
    });
    sending.current = false;
    setBusy(false);
    if (!out.ok) {
      if (out.code === 'signedOut') window.location.assign('/enter');
      else setError(out.code);
      return;
    }
    const now = new Date().toISOString();
    const next: ConversationRecord = {
      ownerId,
      known: out.answer.guest,
      current: {
        question: input.question.trim(),
        final,
        locale,
        answer: out.answer,
        edit: null,
        createdAt: now,
      },
      updatedAt: now,
    };
    setRecord(next);
    await keep(saveConversation(next));
  }

  async function saveEdit(text: string) {
    if (!record?.current) return;
    const next = { ...record, current: { ...record.current, edit: text } };
    setRecord(next);
    await keep(saveConversation(next));
  }

  // The same guest's next message: what they told stays.
  async function nextMessage() {
    if (!record) return;
    if (isOld(record)) return newConversation();
    const next = { ...record, current: null, updatedAt: new Date().toISOString() };
    setRecord(next);
    setQuestion('');
    setFinal(false);
    setError(null);
    await keep(saveConversation(next));
  }

  // Another guest: nothing of this conversation stays.
  async function newConversation() {
    setRecord(null);
    setQuestion('');
    setFinal(false);
    setError(null);
    await keep(clearConversation(ownerId));
  }

  const errorLine = error && (
    <p
      role="alert"
      className="rounded-control border border-error px-4 py-3 text-[15px] text-error"
    >
      {isUsageCode(error) ? <UsageMessage code={error} action="answers" /> : t(`errors.${error}`)}
    </p>
  );
  // At 0, the button is off and says when it comes back, unless the server's
  // refusal already says so.
  const limitLine = limit && !isUsageCode(error) && (
    <p className="text-[13px] text-error">
      <UsageMessage code={limit} action="answers" />
    </p>
  );
  const finalBox = (
    <div className="flex items-start gap-3">
      <input
        id={`${id}-final`}
        type="checkbox"
        className="mt-0.5 size-5 shrink-0 accent-accent"
        checked={final}
        disabled={busy}
        onChange={(e) => setFinal(e.target.checked)}
      />
      <div className="flex flex-col gap-0.5">
        <Label htmlFor={`${id}-final`}>{t('final')}</Label>
        <p className="text-[13px] text-ink-secondary">{t('finalHint')}</p>
      </div>
    </div>
  );

  if (!loaded) return null;
  const known = record?.known ?? NO_GUEST;
  const current = record?.current ?? null;

  if (!current) {
    return (
      <section className="mt-5 flex flex-col gap-4">
        <p className="text-[15px] leading-normal text-ink-secondary">{t('intro')}</p>
        <KnownBox known={known} disabled={busy} onReset={() => void newConversation()} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-question`}>{t('label')}</Label>
          <Textarea
            id={`${id}-question`}
            rows={5}
            maxLength={QUESTION_LIMITS.question}
            disabled={busy}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <p className="text-[13px] text-ink-secondary">{t('hint')}</p>
        </div>
        {finalBox}
        <Button
          type="button"
          disabled={busy || question.trim() === '' || limit !== null}
          onClick={() => void write({ question, again: false })}
        >
          {busy ? t('writing') : t('write')}
        </Button>
        {busy && <p className="text-[13px] text-ink-secondary">{t('keepOpen')}</p>}
        {limitLine}
        {errorLine}
      </section>
    );
  }

  const { answer } = current;
  return (
    <section className="mt-5 flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-control bg-field-muted px-4 py-3">
        <h3 className="text-[13px] font-semibold text-ink-secondary">
          {t('heading', { language: languageName(answer.questionLanguage, locale) })}
        </h3>
        <p className="whitespace-pre-line text-[15px] leading-normal">{current.question}</p>
        {answer.questionTranslation && (
          <p
            data-translation
            className="whitespace-pre-line border-t border-edge/40 pt-2 text-[15px] leading-normal text-ink-secondary"
          >
            {answer.questionTranslation}
          </p>
        )}
      </div>
      <KnownBox known={known} />
      {answer.sexual && <p className={NOTE}>{t('sexual')}</p>}
      {answer.unanswered && <p className={NOTE}>{t('unanswered')}</p>}
      <ReplyCard
        key={current.createdAt}
        title={t('answer')}
        text={current.edit ?? answer.answer.text}
        translation={answer.answer.translation}
        edited={current.edit !== null}
        onSave={(text) => void saveEdit(text)}
        copyLabel={t('copy')}
      />
      {answer.flags.map((flag) => (
        <p key={`${flag.kind}-${flag.text}`} className="text-[13px] text-error">
          {t(`flags.${flag.kind}`, { text: flag.text })}
        </p>
      ))}
      <p className="text-[13px] text-ink-secondary">{t('howTo')}</p>
      {finalBox}
      {errorLine}
      <div className="flex flex-wrap justify-center gap-x-6">
        <button
          type="button"
          className={LINK}
          disabled={busy || limit !== null}
          onClick={() => void write({ question: current.question, again: true })}
        >
          {busy ? t('writing') : t('again')}
        </button>
        {limitLine}
        <button type="button" className={LINK} disabled={busy} onClick={() => void nextMessage()}>
          {t('next')}
        </button>
      </div>
      <button
        type="button"
        className={OUTLINE}
        disabled={busy}
        onClick={() => void newConversation()}
      >
        {t('newConversation')}
      </button>
    </section>
  );
}

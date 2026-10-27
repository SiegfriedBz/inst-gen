'use client';

import { X } from '@phosphor-icons/react';
import { useFormatter, useTranslations } from 'next-intl';
import { RadioGroup } from 'radix-ui';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  OFFER_LIMITS,
  type OfferAnswers,
  type OfferLength,
  offerUntil,
  toOffer,
} from '@/lib/posts/offer';

// Today's special offer (docs/specs/posts/special-offer, "The sheet"): what
// kind, on which treatments, until when. Taps only; the one box takes digits,
// so a money amount can't be entered.

const PERCENTS = [10, 15, 20];
const LENGTHS: OfferLength[] = ['today', '3days', '1week'];
const LENGTH_KEY = { today: 'today', '3days': 'days3', '1week': 'week1' } as const;

const chip =
  'press min-h-11 rounded-control border px-3.5 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-accent aria-pressed:border-accent aria-pressed:bg-accent-tint aria-pressed:font-medium aria-pressed:text-accent-tint-ink border-edge bg-field text-ink';

// A day of the offer, "Tue 27 Oct", in the screen's language.
export function useOfferDate(): (until: string) => string {
  const t = useTranslations('posts.offer');
  const format = useFormatter();
  return (until) => {
    const [y, m, d] = until.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return t('date', {
      weekday: format.dateTime(date, { weekday: 'short', timeZone: 'UTC' }),
      day: format.dateTime(date, { day: 'numeric', timeZone: 'UTC' }),
      month: format.dateTime(date, { month: 'short', timeZone: 'UTC' }),
    });
  };
}

function Question({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-[15px] font-medium text-ink">{title}</legend>
      {children}
    </fieldset>
  );
}

export function OfferSheet({
  open,
  onOpenChange,
  treatments,
  answers: given,
  onDone,
  onAddTreatments,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treatments: string[];
  answers: OfferAnswers;
  onDone: (answers: OfferAnswers) => void;
  onAddTreatments: () => void;
}) {
  const t = useTranslations('posts.offer');
  const close = useTranslations('posts.images')('close');
  const offerDate = useOfferDate();
  const [answers, setAnswers] = useState(given);
  const [other, setOther] = useState(PERCENTS.includes(given.percent) ? '' : String(given.percent));
  // Each opening starts from the answers given.
  useEffect(() => {
    if (!open) return;
    setAnswers(given);
    setOther(PERCENTS.includes(given.percent) ? '' : String(given.percent));
  }, [open, given]);

  const set = (patch: Partial<OfferAnswers>) => setAnswers((a) => ({ ...a, ...patch }));
  const now = new Date();
  const ready = toOffer(answers, now) !== null;
  const isGift = (name: string) => answers.kind === 'freeExtra' && answers.gift === name;

  function pickGift(name: string) {
    set({ gift: name, treatments: answers.treatments.filter((t) => t !== name) });
  }

  function toggle(name: string) {
    set({
      treatments: answers.treatments.includes(name)
        ? answers.treatments.filter((t) => t !== name)
        : treatments.filter((t) => t === name || answers.treatments.includes(t)),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-describedby={undefined} className="max-h-[94dvh]">
        <div className="flex items-center justify-between gap-2 pt-2 pr-3 pl-5">
          <SheetTitle className="text-[17px] font-medium tracking-normal text-ink">
            {t('title')}
          </SheetTitle>
          <button
            type="button"
            aria-label={close}
            onClick={() => onOpenChange(false)}
            className="flex size-11 items-center justify-center rounded-control text-ink-secondary outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X aria-hidden="true" size={22} />
          </button>
        </div>
        {treatments.length === 0 ? (
          <div className="flex flex-col gap-3 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <p className="text-[15px] leading-normal text-ink">{t('noTreatments')}</p>
            <Button type="button" onClick={onAddTreatments}>
              {t('addTreatments')}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 pb-4">
              <Question title={t('kind')}>
                <RadioGroup.Root
                  aria-label={t('kind')}
                  value={answers.kind}
                  onValueChange={(kind) => set({ kind: kind as OfferAnswers['kind'] })}
                  className="grid grid-cols-2 gap-1 rounded-control border border-edge bg-field-muted p-1"
                >
                  {(['discount', 'freeExtra'] as const).map((kind) => (
                    <RadioGroup.Item
                      key={kind}
                      value={kind}
                      className="min-h-11 rounded-[9px] text-[15px] text-ink-secondary outline-none focus-visible:ring-2 focus-visible:ring-accent data-[state=checked]:bg-field data-[state=checked]:font-medium data-[state=checked]:text-accent-tint-ink data-[state=checked]:ring-1 data-[state=checked]:ring-accent"
                    >
                      {t(kind)}
                    </RadioGroup.Item>
                  ))}
                </RadioGroup.Root>
                {answers.kind === 'discount' ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {PERCENTS.map((percent) => (
                      <button
                        key={percent}
                        type="button"
                        aria-pressed={!other && answers.percent === percent}
                        onClick={() => {
                          setOther('');
                          set({ percent });
                        }}
                        className={chip}
                      >
                        {percent}%
                      </button>
                    ))}
                    <input
                      type="text"
                      inputMode="numeric"
                      aria-label={t('other')}
                      placeholder={t('other')}
                      value={other}
                      onChange={(event) => {
                        const digits = event.target.value.replace(/\D/g, '');
                        setOther(digits);
                        set({ percent: digits ? Number(digits) : PERCENTS[0] });
                      }}
                      className="min-h-11 w-24 rounded-control border border-edge bg-field px-3 text-[15px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-[14px] text-ink-secondary">
                      {answers.gift ? t('gift', { gift: answers.gift }) : t('giftPick')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {treatments.map((name) => (
                        <button
                          key={name}
                          type="button"
                          aria-pressed={answers.gift === name}
                          onClick={() => pickGift(name)}
                          className={chip}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </Question>
              <Question title={t('treatments')}>
                <div className="flex flex-col">
                  {treatments.map((name) => (
                    <label
                      key={name}
                      className="flex min-h-11 items-center gap-3 text-[15px] text-ink has-disabled:text-ink-secondary"
                    >
                      <input
                        type="checkbox"
                        checked={answers.treatments.includes(name) && !isGift(name)}
                        disabled={isGift(name)}
                        onChange={() => toggle(name)}
                        className="size-5 accent-[var(--color-accent)]"
                      />
                      {name}
                    </label>
                  ))}
                </div>
                <p className="text-[13px] leading-normal text-ink-secondary">
                  {t('rule', { minutes: OFFER_LIMITS.minutes })}
                </p>
              </Question>
              <Question title={t('until')}>
                <div className="flex flex-wrap gap-2">
                  {LENGTHS.map((length) => (
                    <button
                      key={length}
                      type="button"
                      aria-pressed={answers.length === length}
                      onClick={() => set({ length })}
                      className={chip}
                    >
                      {t(LENGTH_KEY[length])}
                    </button>
                  ))}
                </div>
                <p className="text-[13px] text-ink-secondary">
                  {t('untilDate', { date: offerDate(offerUntil(now, answers.length)) })}
                </p>
              </Question>
            </div>
            <div className="border-t border-edge/40 px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <Button
                type="button"
                className="w-full"
                disabled={!ready}
                onClick={() => onDone(answers)}
              >
                {t('done')}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

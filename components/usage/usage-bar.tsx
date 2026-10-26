'use client';

import { useTranslations } from 'next-intl';
import { Fragment, type ReactNode } from 'react';
import type { BarAction } from '@/lib/usage/answer';
import { useUsageTime } from './usage-message';
import { useUsage } from './usage-provider';

// One quiet line under the home tabs: what this tab spends that's left
// today, and when it comes back (docs/specs/platform/usage-counters, "The
// usage bar"). Empty, at its height, until the answer comes.

type Tab = 'business' | 'posts' | 'reviews';

const MARK = '\u0000';

export function UsageBar({ tab }: { tab: Tab }) {
  const t = useTranslations('usage');
  const { usage } = useUsage();
  const { time, date } = useUsageTime();
  let content: ReactNode = null;
  if (usage) {
    const resets = t('resets', { time: time(usage.resetsAt) });
    const imagesShown = usage.images.on && !usage.images.monthFull;
    const monthNote =
      tab === 'posts' && usage.images.on && usage.images.monthFull
        ? ` ${t('imagesMonth', { date: date(usage.images.backAt) })}`
        : '';
    if (usage.poolEmpty) {
      content = t('poolEmpty', { time: time(usage.resetsAt) });
    } else if (!usage.limited || !usage.left) {
      content = `${t('developer')} · ${resets}${monthNote}`;
    } else {
      const left = usage.left;
      const actions: BarAction[] =
        tab === 'business'
          ? ['reads']
          : tab === 'reviews'
            ? ['replies']
            : imagesShown
              ? ['attempts', 'newImages']
              : ['attempts'];
      const items = actions.map((action, i) => (
        <Fragment key={action}>
          {i > 0 && ', '}
          <span className={left[action] === 0 ? 'text-error' : undefined}>
            {t(action, { count: left[action] })}
          </span>
        </Fragment>
      ));
      const [before, after] = t('left', { items: MARK }).split(MARK);
      content = (
        <>
          {before}
          {items}
          {after} · {resets}
          {monthNote}
        </>
      );
    }
  }
  return (
    <p
      data-testid="usage-bar"
      className="mt-2 min-h-[18px] text-[13px] leading-snug text-ink-secondary"
    >
      {content}
    </p>
  );
}

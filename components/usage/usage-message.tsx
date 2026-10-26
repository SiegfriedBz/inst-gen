'use client';

import { useFormatter, useTranslations } from 'next-intl';
import type { UsageCode } from '@/lib/usage/codes';
import { nextMonth, nextReset } from '@/lib/usage/day';
import { type LimitedAction, OWNER_LIMITS } from '@/lib/usage/limits';
import { useUsage } from './usage-provider';

// Times in the phone's own zone and the screen's language
// (docs/specs/platform/usage-counters, "Strings").
export function useUsageTime(): { time(iso: string): string; date(iso: string): string } {
  const format = useFormatter();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    time: (iso) =>
      format.dateTime(new Date(iso), {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }),
    date: (iso) => format.dateTime(new Date(iso), { timeZone, day: 'numeric', month: 'long' }),
  };
}

// The line shown where an action's error shows, for a usage refusal or a
// count at 0. Before the bar's answer, the times come from the clock.
export function UsageMessage({ code, action }: { code: UsageCode; action: LimitedAction }) {
  const t = useTranslations('usage');
  const { usage } = useUsage();
  const { time, date } = useUsageTime();
  const resetsAt = usage?.resetsAt ?? nextReset(new Date()).toISOString();
  switch (code) {
    case 'limit_reached':
      return <>{t(`limit.${action}`, { limit: OWNER_LIMITS[action], time: time(resetsAt) })}</>;
    case 'pool_empty':
      return <>{t('poolEmpty', { time: time(resetsAt) })}</>;
    case 'images_month':
      return (
        <>
          {t('imagesMonth', {
            date: date(usage?.images.backAt ?? nextMonth(new Date()).toISOString()),
          })}
        </>
      );
    case 'usage_unavailable':
      return <>{t('unavailable')}</>;
  }
}

'use client';

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import type { BarAction, UsageAnswer } from '@/lib/usage/answer';
import { fetchUsage, USAGE_EVENT } from '@/lib/usage/client';
import type { UsageCode } from '@/lib/usage/codes';

// What the owner has left today, read when the home screen opens, after
// every counted request settles, and when the page comes back into view.
// Without the provider (or before the first answer), usage is null and
// nothing is disabled: the server still refuses past a limit.

type Usage = { usage: UsageAnswer | null; refresh(): void };

const UsageContext = createContext<Usage>({ usage: null, refresh: () => {} });

export function UsageProvider({ children }: { children: ReactNode }) {
  const [usage, setUsage] = useState<UsageAnswer | null>(null);
  const refresh = useCallback(() => {
    void fetchUsage().then((answer) => {
      if (answer) setUsage(answer);
    });
  }, []);
  useEffect(() => {
    refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener(USAGE_EVENT, refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener(USAGE_EVENT, refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);
  return <UsageContext value={{ usage, refresh }}>{children}</UsageContext>;
}

export function useUsage(): Usage {
  return useContext(UsageContext);
}

// Why the button for this action is off, or null while it can be tapped
// (docs/specs/platform/usage-counters, "At a limit").
export function useAtLimit(action: BarAction): UsageCode | null {
  const { usage } = useUsage();
  if (!usage) return null;
  if (action === 'newImages') {
    if (usage.images.monthFull) return 'images_month';
  } else if (usage.poolEmpty) {
    return 'pool_empty';
  }
  return usage.limited && usage.left?.[action] === 0 ? 'limit_reached' : null;
}

'use client';

import type { Icon } from '@phosphor-icons/react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTyping } from './use-typing';

export type HomeTab = 'business' | 'posts' | 'reviews';

// The three home tabs in a bar fixed to the bottom of the screen, an icon over
// each label (docs/specs/platform/friendlier-home, "The tabs move to a bottom
// bar"). It sits inside the home's <Tabs>, and hides while the keyboard is up.
export function HomeTabBar({
  label,
  tabs,
}: {
  label: string;
  tabs: { value: HomeTab; label: string; icon: Icon }[];
}) {
  const typing = useTyping();
  return (
    <div
      data-tab-bar
      hidden={typing}
      className="fixed inset-x-0 bottom-0 z-10 border-t border-edge/40 bg-field pb-[env(safe-area-inset-bottom)] print:hidden"
    >
      <TabsList aria-label={label} className="mx-auto h-16 max-w-[420px]">
        {tabs.map(({ value, label: name, icon: TabIcon }) => (
          <TabsTrigger key={value} value={value}>
            <span className="flex h-7 w-14 items-center justify-center rounded-full group-data-[state=active]:bg-accent-tint">
              <TabIcon aria-hidden="true" size={24} />
            </span>
            {name}
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  );
}

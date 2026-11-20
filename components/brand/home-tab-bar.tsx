'use client';

import type { Icon } from '@phosphor-icons/react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFieldAboveBar } from './field-above-bar';

export type HomeTab = 'business' | 'posts' | 'reviews' | 'questions';

// The home tabs in a bar fixed to the bottom of the screen, an icon over each
// label (docs/specs/platform/friendlier-home, "The tabs move to a bottom bar");
// four since docs/specs/questions/answer-drafts. It sits inside the home's
// <Tabs>, and stays while the owner types (changed 2026-11-20): the viewport
// keeps it above an Android keyboard, and the field being typed in scrolls
// clear of it.
export function HomeTabBar({
  label,
  tabs,
}: {
  label: string;
  tabs: { value: HomeTab; label: string; icon: Icon }[];
}) {
  useFieldAboveBar();
  return (
    <div
      data-tab-bar
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

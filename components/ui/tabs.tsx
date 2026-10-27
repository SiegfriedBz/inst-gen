'use client';

import { Tabs as TabsPrimitive } from 'radix-ui';
import type * as React from 'react';
import { cn } from '@/lib/utils';

// shadcn/ui tabs on Radix, restyled to the Shopfront tokens as a bottom bar:
// an icon over each label, the open tab's icon on a tinted pill, never solid
// jade (docs/specs/platform/friendlier-home).
// Every panel stays mounted, so switching never stops what a hidden one is
// doing; the caller hides the panels that aren't open.

function Tabs(props: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" {...props} />;
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn('grid auto-cols-fr grid-flow-col', className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'group flex min-h-11 flex-col items-center justify-center gap-0.5 px-1 text-center text-[12px] leading-tight text-ink-secondary outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset data-[state=active]:font-medium data-[state=active]:text-accent-tint-ink',
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      forceMount
      className={cn('outline-none', className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };

'use client';

import { Tabs as TabsPrimitive } from 'radix-ui';
import type * as React from 'react';
import { cn } from '@/lib/utils';

// shadcn/ui tabs on Radix, restyled to the Shopfront tokens: one segmented
// bar, the open tab filled with the accent (docs/specs/platform/home-tabs).
// Every panel stays mounted, so switching never stops what a hidden one is
// doing; the caller hides the panels that aren't open.

function Tabs(props: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" {...props} />;
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'grid auto-cols-fr grid-flow-col gap-1 rounded-[14px] border border-edge/40 bg-field-muted p-1',
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'flex min-h-11 items-center justify-center rounded-[10px] px-1.5 py-1 text-center text-sm leading-tight font-medium text-ink-secondary outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-field-muted data-[state=active]:bg-accent data-[state=active]:text-on-accent',
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

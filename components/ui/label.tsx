'use client';

import { Label as LabelPrimitive } from 'radix-ui';
import type * as React from 'react';
import { cn } from '@/lib/utils';

// shadcn/ui label, restyled to the Shopfront tokens.
function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn('block text-[13px] text-ink-secondary', className)}
      {...props}
    />
  );
}

export { Label };

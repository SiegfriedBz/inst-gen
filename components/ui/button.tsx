import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type * as React from 'react';
import { cn } from '@/lib/utils';

// shadcn/ui button, restyled to the Shopfront tokens. One variant for now.
const buttonVariants = cva(
  'press inline-flex h-12 w-full items-center justify-center rounded-control bg-accent px-4 text-[15px] font-medium text-on-accent outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page disabled:opacity-60',
);

function Button({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button';
  return <Comp data-slot="button" className={cn(buttonVariants(), className)} {...props} />;
}

export { Button, buttonVariants };

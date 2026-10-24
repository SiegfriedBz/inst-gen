import type * as React from 'react';
import { cn } from '@/lib/utils';

// shadcn/ui input, restyled to the Shopfront tokens. `aria-invalid` shows the error state.
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-12 w-full rounded-control border border-edge bg-field px-3.5 text-base text-ink outline-none placeholder:text-ink-secondary focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent read-only:bg-field-muted read-only:text-ink-secondary aria-invalid:border-error aria-invalid:focus-visible:ring-2 aria-invalid:focus-visible:ring-error aria-invalid:focus-visible:ring-offset-2 aria-invalid:focus-visible:ring-offset-page',
        className,
      )}
      {...props}
    />
  );
}

export { Input };

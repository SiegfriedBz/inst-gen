import type * as React from 'react';
import { cn } from '@/lib/utils';

// shadcn/ui textarea, restyled to the Shopfront tokens, like Input.
function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'min-h-24 w-full rounded-control border border-edge bg-field px-3.5 py-3 text-base text-ink outline-none placeholder:text-ink-secondary focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent aria-invalid:border-error aria-invalid:focus-visible:ring-2 aria-invalid:focus-visible:ring-error',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };

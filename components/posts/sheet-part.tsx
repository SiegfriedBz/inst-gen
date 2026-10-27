'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useId } from 'react';
import { cn } from '@/lib/utils';

// One boxed part of an opened suggestion, with its button under what it takes
// away (docs/specs/posts/story-text, "What the owner sees"): a small number,
// its name, and a dashed border when the owner may skip it.
export function SheetPart({
  n,
  title,
  optional = false,
  children,
}: {
  n: number;
  title: string;
  optional?: boolean;
  children: ReactNode;
}) {
  const t = useTranslations('posts.parts');
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn(
        'rounded-control border bg-field p-3.5',
        optional ? 'border-dashed border-edge/70' : 'border-edge/45',
      )}
    >
      <h3 id={id} className="mb-2.5 flex items-center gap-2 text-[14px] font-semibold">
        <span
          aria-hidden="true"
          className="inline-flex size-[22px] items-center justify-center rounded-full bg-accent-tint text-[12px] font-semibold text-accent-tint-ink"
        >
          {n}
        </span>
        <span>
          {title}
          {optional && (
            <>
              {' '}
              <span className="text-[13px] font-normal text-ink-secondary">{t('optional')}</span>
            </>
          )}
        </span>
      </h3>
      {children}
    </section>
  );
}

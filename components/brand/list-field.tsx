'use client';

import { ArrowDown, ArrowUp, Plus, Trash } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

// A list the owner can add to, reorder and trim, with buttons rather than
// drag: reliable with a thumb and with a screen reader.

const iconButton =
  'inline-flex size-11 items-center justify-center rounded-control text-ink-secondary outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-30';

export function ListField<T>({
  label,
  hint,
  error,
  items,
  onChange,
  addLabel,
  newItem,
  renderItem,
}: {
  label: string;
  hint?: string;
  error?: string;
  items: T[];
  onChange: (items: T[]) => void;
  addLabel: string;
  newItem: () => T;
  renderItem: (item: T, index: number, update: (item: T) => void) => ReactNode;
}) {
  const t = useTranslations('brand.edit.list');
  const move = (from: number, to: number) => {
    const next = [...items];
    const [item] = next.splice(from, 1);
    if (item !== undefined) next.splice(to, 0, item);
    onChange(next);
  };
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-[13px] text-ink-secondary">{label}</legend>
      {hint && <p className="-mt-1 text-xs text-ink-secondary">{hint}</p>}
      <ol className="flex flex-col gap-3">
        {items.map((item, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: items have no id and may repeat
          <li key={index} className="rounded-control border border-edge p-3">
            {renderItem(item, index, (changed) =>
              onChange(items.map((old, i) => (i === index ? changed : old))),
            )}
            <div className="-mb-1 mt-1 flex justify-end">
              <button
                type="button"
                aria-label={t('up')}
                disabled={index === 0}
                onClick={() => move(index, index - 1)}
                className={iconButton}
              >
                <ArrowUp aria-hidden size={18} />
              </button>
              <button
                type="button"
                aria-label={t('down')}
                disabled={index === items.length - 1}
                onClick={() => move(index, index + 1)}
                className={iconButton}
              >
                <ArrowDown aria-hidden size={18} />
              </button>
              <button
                type="button"
                aria-label={t('remove')}
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                className={iconButton}
              >
                <Trash aria-hidden size={18} />
              </button>
            </div>
          </li>
        ))}
      </ol>
      {error && <p className="text-xs text-error">{error}</p>}
      <button
        type="button"
        onClick={() => onChange([...items, newItem()])}
        className="inline-flex min-h-11 items-center gap-1.5 self-start text-[15px] font-medium text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Plus aria-hidden size={16} />
        {addLabel}
      </button>
    </fieldset>
  );
}

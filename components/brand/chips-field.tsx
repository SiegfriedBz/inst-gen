'use client';

import { X } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

// A short list of words as chips, with a field to add one.
export function ChipsField({
  label,
  hint,
  error,
  words,
  onChange,
}: {
  label: string;
  hint?: string;
  error?: string;
  words: string[];
  onChange: (words: string[]) => void;
}) {
  const t = useTranslations('brand.edit.chips');
  const [draft, setDraft] = useState('');
  const add = () => {
    const word = draft.trim();
    if (word && !words.includes(word)) onChange([...words, word]);
    setDraft('');
  };
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-[13px] text-ink-secondary">{label}</legend>
      {hint && <p className="-mt-1 text-xs text-ink-secondary">{hint}</p>}
      {words.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {words.map((word) => (
            <li
              key={word}
              className="inline-flex items-center rounded-full bg-accent-tint py-0.5 pl-3 text-[15px] text-accent-tint-ink"
            >
              {word}
              <button
                type="button"
                aria-label={t('removeWord', { word })}
                onClick={() => onChange(words.filter((w) => w !== word))}
                className="inline-flex size-9 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X aria-hidden size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          aria-label={t('addWord', { label })}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          onClick={add}
          className="min-h-11 shrink-0 px-2 text-[15px] font-medium text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {t('add')}
        </button>
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
    </fieldset>
  );
}

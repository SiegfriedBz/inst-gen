'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { CopyText } from '@/components/copy-text';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { REPLY_LIMITS } from '@/lib/reviews/reply';

const LINK =
  'inline-flex min-h-11 items-center self-start text-[15px] font-medium text-accent underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-accent';

// The reply picked with "Short | Warmer" (docs/specs/platform/friendlier-home,
// after docs/specs/reviews/reply-drafts): the text as it will be pasted, its
// translation for the owner, "Edit the text" and one copy button. An edited
// reply loses its translation: it no longer matches. `title` names the edit box.
export function ReplyCard({
  title,
  text,
  translation,
  edited,
  onSave,
  copyLabel,
}: {
  title: string;
  text: string;
  translation: string | null;
  edited: boolean;
  onSave: (text: string) => void;
  copyLabel: string;
}) {
  const t = useTranslations('posts');
  const [draft, setDraft] = useState<string | null>(null);
  const blank = draft !== null && draft.trim() === '';

  return (
    <article className="flex flex-col gap-3 rounded-control border border-edge bg-field px-4 py-3">
      {draft === null ? (
        <>
          <p className="whitespace-pre-line text-[17px] leading-normal">{text}</p>
          {translation && !edited && (
            <p
              data-translation
              className="whitespace-pre-line border-t border-edge/40 pt-2 text-[15px] leading-normal text-ink-secondary"
            >
              {translation}
            </p>
          )}
          <button type="button" className={LINK} onClick={() => setDraft(text)}>
            {t('editText')}
          </button>
          <CopyText text={text} label={copyLabel} />
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <Textarea
            aria-label={title}
            className="[field-sizing:content]"
            rows={6}
            maxLength={REPLY_LIMITS.reply}
            value={draft}
            aria-invalid={blank || undefined}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              disabled={blank}
              onClick={() => {
                onSave(draft.trim());
                setDraft(null);
              }}
            >
              {t('edit.save')}
            </Button>
            <Button
              type="button"
              className="border border-edge bg-field text-ink"
              onClick={() => setDraft(null)}
            >
              {t('edit.cancel')}
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}

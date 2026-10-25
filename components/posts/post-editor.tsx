'use client';

import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { POSTS_LIMITS, type Post } from '@/lib/posts/batch';
import { charsOver, type PostEdit } from '@/lib/posts/edit';

// A post's words as fields (docs/specs/posts/editor-download, "Editing a
// post"). The call to action stays read-only below the caption; code cleans
// the hashtags and checks the caption once the card saves the edit.
export function PostEditor({
  post,
  cta,
  onSave,
  onCancel,
}: {
  post: Post;
  cta: string;
  onSave: (edit: PostEdit) => void;
  onCancel: () => void;
}) {
  const t = useTranslations('posts');
  const id = useId();
  const [edit, setEdit] = useState<PostEdit>({
    caption: post.caption,
    hashtags: post.hashtags.map((tag) => `#${tag}`).join(' '),
    altText: post.altText,
  });
  const empty = edit.caption.trim() === '';
  const over = charsOver(edit, cta);
  const set = (field: keyof PostEdit) => (value: string) =>
    setEdit((current) => ({ ...current, [field]: value }));
  return (
    <div className="mt-2 flex flex-col gap-2">
      <Label htmlFor={`${id}-caption`}>{t('edit.caption')}</Label>
      <Textarea
        id={`${id}-caption`}
        className="[field-sizing:content]"
        rows={8}
        value={edit.caption}
        aria-invalid={empty || over > 0 || undefined}
        onChange={(e) => set('caption')(e.target.value)}
      />
      {empty && <p className="text-[13px] text-error">{t('edit.empty')}</p>}
      {over > 0 && <p className="text-[13px] text-error">{t('edit.tooLong', { count: over })}</p>}
      {cta && <p className="text-[15px] text-ink-secondary">{cta}</p>}
      <Label htmlFor={`${id}-hashtags`}>{t('edit.hashtags')}</Label>
      <Input
        id={`${id}-hashtags`}
        autoCapitalize="none"
        value={edit.hashtags}
        onChange={(e) => set('hashtags')(e.target.value)}
      />
      <p className="text-[13px] text-ink-secondary">{t('edit.hashtagsHint')}</p>
      <Label htmlFor={`${id}-alt`}>{t('imageDescription')}</Label>
      <Input
        id={`${id}-alt`}
        maxLength={POSTS_LIMITS.altTextChars}
        value={edit.altText}
        onChange={(e) => set('altText')(e.target.value)}
      />
      <p className="text-[13px] text-ink-secondary">
        {t('edit.altCount', { count: edit.altText.length, max: POSTS_LIMITS.altTextChars })}
      </p>
      <div className="mt-1 flex gap-2">
        <Button type="button" className="border border-edge bg-field text-ink" onClick={onCancel}>
          {t('edit.cancel')}
        </Button>
        <Button type="button" disabled={empty || over > 0} onClick={() => onSave(edit)}>
          {t('edit.save')}
        </Button>
      </div>
    </div>
  );
}

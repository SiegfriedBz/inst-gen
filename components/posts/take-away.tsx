'use client';

import { useTranslations } from 'next-intl';
import { CopyText } from '@/components/copy-text';
import { Button } from '@/components/ui/button';
import type { Post } from '@/lib/posts/batch';
import { postText } from '@/lib/posts/edit';
import type { SavedImage } from '@/lib/posts/image-store';
import { imageFileName, saveImageFiles } from '@/lib/posts/take-away';
import type { TakenStep } from '@/lib/posts/taken';

// The two steps that take a suggestion away (docs/specs/posts/suggestions, "A
// suggestion"): both images to the phone in one share sheet, then the text to
// the clipboard, with how to post them in Instagram. Without images, only the
// text, unnumbered. `onTaken` hears of each step done; a share the owner
// cancels isn't one (docs/specs/platform/friendlier-home, "Saved and copied").
export function TakeAway({
  post,
  cta,
  image,
  imagesOn,
  name,
  createdAt,
  attempt,
  n,
  onTaken,
}: {
  post: Post;
  cta: string;
  // Only once the image is saved and no new one is being made.
  image?: SavedImage;
  imagesOn: boolean;
  name: string;
  createdAt: string;
  attempt: number;
  n: number;
  onTaken?: (step: TakenStep) => void;
}) {
  const t = useTranslations('posts');
  const text = postText(post, cta);

  async function save() {
    if (!image) return;
    const done = await saveImageFiles(
      (['post', 'story'] as const).map((kind) => ({
        blob: image[kind],
        name: imageFileName(name, createdAt, attempt, n, kind),
      })),
    );
    if (done !== 'cancelled') onTaken?.('saved');
  }

  const step = (number: number) => (
    <span
      aria-hidden="true"
      className="mr-2 inline-flex size-6 items-center justify-center rounded-full bg-black/10 text-[13px]"
    >
      {number}
    </span>
  );

  return (
    <div className="flex flex-col gap-2">
      {imagesOn && (
        <Button type="button" onClick={() => void save()} disabled={!image}>
          {step(1)}
          {t('saveImages')}
        </Button>
      )}
      <CopyText
        text={text}
        onCopied={() => onTaken?.('copied')}
        className={imagesOn ? 'border border-edge bg-field text-ink' : undefined}
        label={
          <>
            {imagesOn && step(2)}
            {t('copyText')}
          </>
        }
      />
      <p className="text-[13px] text-ink-secondary">{imagesOn ? t('howTo') : t('howToTextOnly')}</p>
    </div>
  );
}

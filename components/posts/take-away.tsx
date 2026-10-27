'use client';

import { useTranslations } from 'next-intl';
import { CopyText } from '@/components/copy-text';
import { Button } from '@/components/ui/button';
import type { Post } from '@/lib/posts/batch';
import { postText } from '@/lib/posts/edit';
import type { SavedImage } from '@/lib/posts/image-store';
import { imageFileName, saveImageFiles } from '@/lib/posts/take-away';
import type { TakenStep } from '@/lib/posts/taken';

// The buttons that take a suggestion away, each under its part of the sheet
// (docs/specs/posts/story-text, "What the owner sees"): both images to the
// phone in one share sheet, the post's text, and the optional story text,
// each with how to post it in Instagram. `onTaken` hears of the first two; a
// share the owner cancels isn't one, and the story text never is
// (docs/specs/platform/friendlier-home, "Saved and copied").

function Hint({ children }: { children: string }) {
  return <p className="mt-2 text-[13px] text-ink-secondary">{children}</p>;
}

export function SaveImages({
  image,
  name,
  createdAt,
  attempt,
  n,
  onTaken,
}: {
  // Only once the image is saved and no new one is being made.
  image?: SavedImage;
  name: string;
  createdAt: string;
  attempt: number;
  n: number;
  onTaken?: (step: TakenStep) => void;
}) {
  const t = useTranslations('posts');

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

  return (
    <div className="mt-3">
      <Button type="button" onClick={() => void save()} disabled={!image}>
        {t('saveImages')}
      </Button>
      <Hint>{t('hints.images')}</Hint>
    </div>
  );
}

export function CopyPost({
  post,
  cta,
  imagesOn,
  onTaken,
}: {
  post: Post;
  cta: string;
  imagesOn: boolean;
  onTaken?: (step: TakenStep) => void;
}) {
  const t = useTranslations('posts');
  return (
    <div className="mt-3">
      <CopyText
        text={postText(post, cta)}
        onCopied={() => onTaken?.('copied')}
        label={t('copyText')}
      />
      <Hint>{imagesOn ? t('hints.post') : t('hints.postOwnPhoto')}</Hint>
    </div>
  );
}

export function CopyStory({ storyText, imagesOn }: { storyText: string; imagesOn: boolean }) {
  const t = useTranslations('posts');
  return (
    <div className="mt-3">
      <CopyText text={storyText} label={t('copyStory')} />
      <Hint>{imagesOn ? t('hints.story') : t('hints.storyOwnPhoto')}</Hint>
    </div>
  );
}

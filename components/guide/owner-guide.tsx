'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { OWNER_LIMITS } from '@/lib/usage/limits';

// The owner guide (docs/specs/guide/owner-guide): one page, eight sections,
// in the screen's language. Buttons are named with their own strings and the
// daily numbers come from the limits, so the guide follows the app.

export const GUIDE_SECTIONS = [
  'start',
  'business',
  'posts',
  'instagram',
  'reviews',
  'allowance',
  'languages',
  'trouble',
] as const;
type SectionId = (typeof GUIDE_SECTIONS)[number];

// A section's lines in order: a key is a paragraph, a list of keys is a
// numbered list of steps.
type Block = string | string[];
const BLOCKS: Record<SectionId, Block[]> = {
  start: ['passphrase', 'home', ['iphone', 'android'], 'why', 'onePhone'],
  business: ['read', 'check', 'missing', 'english', 'reread'],
  posts: ['make', 'offer', 'open', 'wait', 'leave', 'more', 'edit', 'update'],
  instagram: [['save', 'copy', 'post', 'story'], 'link', 'alt', 'noImages', 'never'],
  reviews: ['paste', 'pick', 'other'],
  allowance: ['free', 'limits', 'bar', 'reset', 'time', 'month'],
  languages: ['switch', 'captions'],
  trouble: ['limit', 'pool', 'paused', 'gone', 'contact'],
};

type Limits = Record<'reads' | 'attempts' | 'newImages' | 'replies', number>;

export function OwnerGuide({
  contact,
  limits = OWNER_LIMITS,
}: {
  contact: string | null;
  limits?: Limits;
}) {
  const t = useTranslations();

  // What each line names: the app's own button and tab names, and the limits.
  const values: Record<string, Record<string, ReactNode>> = {
    'start.passphrase': { button: t('enter.submit') },
    'business.read': { button: t('brand.home.read') },
    'business.check': { button: t('brand.panel.edit') },
    'business.reread': { button: t('brand.home.reread'), forget: t('brand.home.forget') },
    'posts.make': { tab: t('home.tabs.posts'), button: t('posts.make') },
    'posts.offer': { button: t('posts.offer.add') },
    'posts.open': { saved: t('posts.saved') },
    'posts.more': { button: t('posts.makeMore') },
    'posts.edit': { button: t('posts.editText'), image: t('posts.images.newImage') },
    'instagram.save': { button: t('posts.saveImages') },
    'instagram.copy': { button: t('posts.copyText') },
    'reviews.paste': { tab: t('home.tabs.reviews'), button: t('reviews.write') },
    'reviews.pick': { short: t('reviews.short'), warm: t('reviews.warm') },
    'reviews.other': { button: t('reviews.again') },
    'allowance.limits': {
      reads: t('usage.reads', { count: limits.reads }),
      attempts: t('usage.attempts', { count: limits.attempts }),
      newImages: t('usage.newImages', { count: limits.newImages }),
      replies: t('usage.replies', { count: limits.replies }),
    },
    'trouble.contact': {
      contact: contact && (
        <a href={`https://wa.me/${contact.replace(/\D/g, '')}`} className="font-medium text-accent">
          {contact}
        </a>
      ),
    },
  };

  const line = (id: SectionId, key: string) =>
    t.rich(`guide.${id}.${key}`, {
      ...values[`${id}.${key}`],
      b: (chunks) => <b className="font-medium">{chunks}</b>,
      code: (chunks) => (
        <code className="rounded bg-field-muted px-1 text-[14px] break-all">{chunks}</code>
      ),
    });

  const blocks = (id: SectionId) =>
    BLOCKS[id]
      .filter((block) => !(id === 'trouble' && block === 'contact' && !contact))
      .map((block) =>
        typeof block === 'string' ? (
          <p key={block}>{line(id, block)}</p>
        ) : (
          <ol key={block.join()} className="list-decimal space-y-2 pl-5">
            {block.map((key) => (
              <li key={key}>{line(id, key)}</li>
            ))}
          </ol>
        ),
      );

  return (
    <article className="mt-8 text-[16px] leading-relaxed print:mt-0">
      <h1 className="text-[26px] leading-[1.15] font-medium tracking-[-0.02em]">
        {t('guide.title')}
      </h1>
      <p className="mt-2 text-ink-secondary">{t('guide.intro')}</p>

      <nav aria-label={t('guide.contents')} className="mt-6 print:hidden">
        <ol className="list-decimal space-y-1 pl-5">
          {GUIDE_SECTIONS.map((id) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="inline-flex min-h-11 items-center text-accent underline-offset-4 hover:underline"
              >
                {t(`guide.${id}.title`)}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {GUIDE_SECTIONS.map((id) => (
        <section
          key={id}
          id={id}
          aria-labelledby={`${id}-title`}
          className="mt-10 scroll-mt-4 space-y-3 print:mt-6 print:break-inside-avoid-page"
        >
          <h2 id={`${id}-title`} className="text-[20px] font-medium print:break-after-avoid">
            {t(`guide.${id}.title`)}
          </h2>
          {blocks(id)}
        </section>
      ))}

      <Button type="button" className="mt-10 w-full print:hidden" onClick={() => window.print()}>
        {t('guide.print')}
      </Button>
    </article>
  );
}

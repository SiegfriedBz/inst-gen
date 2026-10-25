'use client';

import { useTranslations } from 'next-intl';

// The few lines the pages used to translate on the server, here so they
// switch language with the rest of the screen, at once
// (docs/specs/posts/suggestions, "A faster language switch").

export function Welcome({ name }: { name: string }) {
  const t = useTranslations('home');
  return (
    <h1 className="mt-11 text-[26px] leading-[1.15] font-medium tracking-[-0.02em]">
      {t('welcome', { name })}
    </h1>
  );
}

export function SignedInNote() {
  const t = useTranslations('home');
  return <p className="mt-auto pt-10 text-xs text-ink-secondary">{t('signedIn')}</p>;
}

export function EnterIntro() {
  const t = useTranslations('meta');
  return (
    <>
      <h1 className="mt-11 text-[30px] leading-[1.1] font-medium tracking-[-0.02em]">
        {t('title')}
      </h1>
      <p className="mt-1.5 mb-8 text-[15px] leading-normal text-ink-secondary">
        {t('description')}
      </p>
    </>
  );
}

export function EnterFooter() {
  const t = useTranslations('enter');
  return <p className="mt-auto pt-10 text-xs text-ink-secondary">{t('footer')}</p>;
}

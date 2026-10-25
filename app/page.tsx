import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { BrandHome } from '@/components/brand/brand-home';
import { LanguageSwitch } from '@/components/language-switch';
import { ShopfrontMark } from '@/components/shopfront-mark';
import { displayName } from '@/lib/pilot/config';
import { getCurrentOwner } from '@/lib/pilot/current-owner';
import { imagesOn } from '@/lib/posts/image-access';

export default async function HomePage() {
  const ownerId = await getCurrentOwner();
  if (!ownerId) redirect('/enter');
  const name = displayName(ownerId);
  const t = await getTranslations('home');
  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-2">
        <ShopfrontMark />
        <div className="flex min-w-0 items-center gap-2">
          <LanguageSwitch returnTo="/" />
          <span className="min-w-0 truncate rounded-control bg-accent-tint px-3 py-1 text-[13px] text-accent-tint-ink">
            {name}
          </span>
        </div>
      </header>
      <h1 className="mt-11 text-[26px] leading-[1.15] font-medium tracking-[-0.02em]">
        {t('welcome', { name })}
      </h1>
      <BrandHome ownerId={ownerId} imagesOn={imagesOn(ownerId)} />
      <p className="mt-auto pt-10 text-xs text-ink-secondary">{t('signedIn')}</p>
    </main>
  );
}

import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { BrandHome } from '@/components/brand/brand-home';
import { LanguageSwitch } from '@/components/language-switch';
import { ShopfrontMark } from '@/components/shopfront-mark';
import { displayName } from '@/lib/pilot/config';
import { getCurrentOwner } from '@/lib/pilot/current-owner';

export default async function HomePage() {
  const ownerId = await getCurrentOwner();
  if (!ownerId) redirect('/enter');
  const name = displayName(ownerId);
  const t = await getTranslations('home');
  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between">
        <ShopfrontMark />
        <span className="rounded-control bg-accent-tint px-3 py-1 text-[13px] text-accent-tint-ink">
          {name}
        </span>
      </header>
      <h1 className="mt-11 text-[26px] leading-[1.15] font-medium tracking-[-0.02em]">
        {t('welcome', { name })}
      </h1>
      <BrandHome ownerId={ownerId} />
      <LanguageSwitch returnTo="/" />
      <p className="mt-1 text-xs text-ink-secondary">{t('signedIn')}</p>
    </main>
  );
}

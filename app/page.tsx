import { redirect } from 'next/navigation';
import { BrandHome } from '@/components/brand/brand-home';
import { GuideLink } from '@/components/guide/guide-links';
import { LanguageSwitch } from '@/components/language-switch';
import { SignedInNote } from '@/components/screen-text';
import { ShopfrontMark } from '@/components/shopfront-mark';
import { UsageProvider } from '@/components/usage/usage-provider';
import { displayName } from '@/lib/pilot/config';
import { getCurrentOwner } from '@/lib/pilot/current-owner';
import { imagesOn } from '@/lib/posts/image-access';

export default async function HomePage() {
  const ownerId = await getCurrentOwner();
  if (!ownerId) redirect('/enter');
  const name = displayName(ownerId);
  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-14 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <ShopfrontMark />
          <span className="min-w-0 truncate text-[16px] font-medium">{name}</span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <GuideLink />
          <LanguageSwitch returnTo="/" />
        </div>
      </header>
      <UsageProvider>
        <BrandHome ownerId={ownerId} name={name} imagesOn={imagesOn()} />
      </UsageProvider>
      <SignedInNote />
    </main>
  );
}

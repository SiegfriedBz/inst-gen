import { redirect } from 'next/navigation';
import { BrandHome } from '@/components/brand/brand-home';
import { LanguageSwitch } from '@/components/language-switch';
import { SignedInNote, Welcome } from '@/components/screen-text';
import { ShopfrontMark } from '@/components/shopfront-mark';
import { displayName } from '@/lib/pilot/config';
import { getCurrentOwner } from '@/lib/pilot/current-owner';
import { imagesOn } from '@/lib/posts/image-access';

export default async function HomePage() {
  const ownerId = await getCurrentOwner();
  if (!ownerId) redirect('/enter');
  const name = displayName(ownerId);
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
      <Welcome name={name} />
      <BrandHome ownerId={ownerId} imagesOn={imagesOn()} />
      <SignedInNote />
    </main>
  );
}

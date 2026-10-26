import { redirect } from 'next/navigation';
import { BackLink } from '@/components/guide/guide-links';
import { OwnerGuide } from '@/components/guide/owner-guide';
import { LanguageSwitch } from '@/components/language-switch';
import { ShopfrontMark } from '@/components/shopfront-mark';
import { guideContact } from '@/lib/guide/contact';
import { getCurrentOwner } from '@/lib/pilot/current-owner';

export default async function GuidePage() {
  const ownerId = await getCurrentOwner();
  if (!ownerId) redirect('/enter');
  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-2 print:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <ShopfrontMark />
          <BackLink />
        </div>
        <LanguageSwitch returnTo="/guide" />
      </header>
      <OwnerGuide contact={guideContact()} />
    </main>
  );
}

import { getTranslations } from 'next-intl/server';
import { ShopfrontMark } from '@/components/shopfront-mark';
import { SignInForm } from './sign-in-form';

export default async function EnterPage() {
  const meta = await getTranslations('meta');
  const t = await getTranslations('enter');
  return (
    <main className="flex flex-1 flex-col">
      <ShopfrontMark />
      <h1 className="mt-11 text-[30px] leading-[1.1] font-medium tracking-[-0.02em]">
        {meta('title')}
      </h1>
      <p className="mt-1.5 mb-8 text-[15px] leading-normal text-ink-secondary">
        {meta('description')}
      </p>
      <SignInForm />
      <p className="mt-auto pt-10 text-xs text-ink-secondary">{t('footer')}</p>
    </main>
  );
}

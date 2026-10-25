import { LanguageSwitch } from '@/components/language-switch';
import { EnterFooter, EnterIntro } from '@/components/screen-text';
import { ShopfrontMark } from '@/components/shopfront-mark';
import { SignInForm } from './sign-in-form';

export default function EnterPage() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-2">
        <ShopfrontMark />
        <LanguageSwitch returnTo="/enter" />
      </header>
      <EnterIntro />
      <SignInForm />
      <EnterFooter />
    </main>
  );
}

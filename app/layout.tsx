import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { LocaleProvider } from '@/components/locale-provider';
import type { Locale } from '@/lib/i18n/locale';
import './globals.css';

const beVietnam = Be_Vietnam_Pro({
  weight: ['400', '500'],
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  variable: '--font-be-vietnam',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return {
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  // The bottom tab bar reaches the phone's edge and pads itself above the
  // home indicator (docs/specs/platform/friendlier-home).
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f7f5' },
    { media: '(prefers-color-scheme: dark)', color: '#121614' },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = (await getLocale()) as Locale;
  return (
    <html lang={locale} className={beVietnam.variable}>
      <body className="min-h-dvh font-sans antialiased">
        <LocaleProvider initialLocale={locale}>
          <div className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col px-5 pt-7 pb-6 print:min-h-0 print:max-w-none print:p-0">
            {children}
          </div>
        </LocaleProvider>
      </body>
    </html>
  );
}

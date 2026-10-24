import { describe, expect, test } from 'vitest';
import { extractStructured } from '@/lib/brand/extract/structured';

const URL_ = new URL('https://svargabalimassage.com/');
const ld = (json: unknown) =>
  `<script type="application/ld+json">${typeof json === 'string' ? json : JSON.stringify(json)}</script>`;
const doc = (head: string, body = '') => `<html><head>${head}</head><body>${body}</body></html>`;

const spa = {
  '@type': 'DaySpa',
  name: 'Svarga Bali Massage',
  telephone: '+62 812-3456-7890',
  email: 'hello@svargabalimassage.com',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Jl. Pantai Batu Bolong',
    addressLocality: 'Canggu',
    addressRegion: 'Bali',
    addressCountry: 'ID',
  },
  areaServed: ['Canggu', 'Seminyak'],
  priceRange: 'IDR 350k-900k',
  logo: { '@type': 'ImageObject', url: 'https://svargabalimassage.com/logo.png' },
  sameAs: ['https://www.instagram.com/svarga.bali/'],
  makesOffer: [
    {
      '@type': 'Offer',
      itemOffered: { '@type': 'Service', name: 'Balinese massage' },
      price: '450000',
      priceCurrency: 'IDR',
    },
  ],
};

describe('extractStructured: JSON-LD', () => {
  test('reads a DaySpa from an @graph', () => {
    const facts = extractStructured(
      doc(
        ld({
          '@context': 'https://schema.org',
          '@graph': [{ '@type': 'WebSite', name: 'Site' }, spa],
        }),
      ),
      URL_,
    );
    expect(facts.business).toMatchObject({
      name: 'Svarga Bali Massage',
      telephone: '+62 812-3456-7890',
      email: 'hello@svargabalimassage.com',
      address: { street: 'Jl. Pantai Batu Bolong', town: 'Canggu', region: 'Bali', country: 'ID' },
      areaServed: 'Canggu, Seminyak',
      priceRange: 'IDR 350k-900k',
      logo: 'https://svargabalimassage.com/logo.png',
      sameAs: ['https://www.instagram.com/svarga.bali/'],
      offers: [{ name: 'Balinese massage', price: 'IDR 450000' }],
    });
    expect(facts.source).toBe('https://svargabalimassage.com/');
  });

  test('reads @type given as an array', () => {
    const facts = extractStructured(
      doc(ld({ ...spa, '@type': ['LocalBusiness', 'DaySpa'] })),
      URL_,
    );
    expect(facts.business?.name).toBe('Svarga Bali Massage');
  });

  test('reads a top-level array', () => {
    const facts = extractStructured(doc(ld([{ '@type': 'BreadcrumbList' }, spa])), URL_);
    expect(facts.business?.name).toBe('Svarga Bali Massage');
  });

  test('skips a JSON-LD block that is invalid JSON and reads the next', () => {
    const facts = extractStructured(doc(ld('{ "@type": "DaySpa", ') + ld(spa)), URL_);
    expect(facts.business?.name).toBe('Svarga Bali Massage');
  });

  test('ignores a WebSite or BreadcrumbList object', () => {
    const facts = extractStructured(
      doc(ld({ '@type': 'WebSite', name: 'Site' }) + ld({ '@type': 'BreadcrumbList' })),
      URL_,
    );
    expect(facts.business).toBeNull();
  });

  test('openingHoursSpecification becomes a short line', () => {
    const facts = extractStructured(
      doc(
        ld({
          ...spa,
          openingHoursSpecification: {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: [
              'Monday',
              'Tuesday',
              'Wednesday',
              'Thursday',
              'Friday',
              'Saturday',
              'Sunday',
            ],
            opens: '09:00',
            closes: '22:00',
          },
        }),
      ),
      URL_,
    );
    expect(facts.business?.hours).toBe('Mo-Su 09:00-22:00');
  });

  test('a string openingHours is kept as written', () => {
    const facts = extractStructured(doc(ld({ ...spa, openingHours: 'Mo-Sa 10:00-20:00' })), URL_);
    expect(facts.business?.hours).toBe('Mo-Sa 10:00-20:00');
  });

  test('an address given as a string is the street', () => {
    const facts = extractStructured(doc(ld({ ...spa, address: 'Jl. Raya Ubud 1, Ubud' })), URL_);
    expect(facts.business?.address).toEqual({ street: 'Jl. Raya Ubud 1, Ubud' });
  });
});

describe('extractStructured: contact links', () => {
  test('reads WhatsApp, tel, mailto and Instagram', () => {
    const facts = extractStructured(
      doc(
        '',
        `<a href="https://wa.me/6281234567890?text=Hi">WA</a>
         <a href="https://api.whatsapp.com/send?phone=84905123456">WA</a>
         <a href="whatsapp://send?phone=%2B84905000111">WA</a>
         <a href="tel:+84 905 123 456">Call</a>
         <a href="mailto:Book@Sen.vn?subject=hi">Mail</a>
         <a href="https://www.instagram.com/svarga.bali/">IG</a>
         <a href="https://instagram.com/p/abc123/">post</a>
         <a href="https://instagram.com/reel/xyz/">reel</a>`,
      ),
      URL_,
    );
    expect(facts.contact).toEqual({
      whatsapp: ['6281234567890', '84905123456', '84905000111'],
      phone: ['+84 905 123 456'],
      email: ['book@sen.vn'],
      instagram: ['svarga.bali'],
    });
  });

  test('a doubled Instagram link gives the real handle', () => {
    const html = doc(
      '',
      '<a href="https://instagram.com/https://www.instagram.com/svargaspa.bali">IG</a>',
    );
    expect(extractStructured(html, URL_).contact.instagram).toEqual(['svargaspa.bali']);
  });

  test('an Instagram path that is not a handle is ignored', () => {
    const html = doc('', '<a href="https://instagram.com/%3Cyour-handle%3E">IG</a>');
    expect(extractStructured(html, URL_).contact.instagram).toEqual([]);
  });

  test.each([
    ['<p>+84 358 358 353 Phone · WhatsApp · Zalo</p>', '84358358353'],
    ['<p>WhatsApp: +62 811-3888-472</p>', '628113888472'],
    ['<p>Whatsapp +855 12 766 234</p>', '85512766234'],
  ])('reads a WhatsApp number written as text: %s', (body, digits) => {
    expect(extractStructured(doc('', body), URL_).contact.whatsapp).toEqual([digits]);
  });

  test('a phone number far from the word WhatsApp is not taken', () => {
    const body =
      '<p>Call +84 358 358 353 for bookings. We reply to every message within a day, and on WhatsApp too.</p>';
    expect(extractStructured(doc('', body), URL_).contact.whatsapp).toEqual([]);
  });

  test('a wa.me link comes before a number in the text', () => {
    const body = '<a href="https://wa.me/6281234567890">Chat</a><p>WhatsApp: +62 811-3888-472</p>';
    expect(extractStructured(doc('', body), URL_).contact.whatsapp).toEqual([
      '6281234567890',
      '628113888472',
    ]);
  });

  test('a link repeated in header and footer is counted once', () => {
    const link = '<a href="https://wa.me/6281234567890">WA</a>';
    expect(extractStructured(doc('', link + link), URL_).contact.whatsapp).toEqual([
      '6281234567890',
    ]);
  });
});

describe('extractStructured: meta tags', () => {
  test('reads Open Graph, title, description and theme-color', () => {
    const facts = extractStructured(
      doc(`<title> Svarga | Mobile Massage in Bali </title>
        <meta property="og:site_name" content="Svarga">
        <meta property="og:title" content="Svarga Bali">
        <meta property="og:description" content="Massage at your villa">
        <meta property="og:image" content="/og.jpg">
        <meta name="description" content="Mobile spa">
        <meta name="theme-color" content="#1F6F5C">`),
      URL_,
    );
    expect(facts.meta).toEqual({
      siteName: 'Svarga',
      title: 'Svarga | Mobile Massage in Bali',
      ogTitle: 'Svarga Bali',
      description: 'Massage at your villa',
      ogImage: 'https://svargabalimassage.com/og.jpg',
      themeColor: '#1F6F5C',
    });
  });
});

import type { Profile } from '@/lib/brand/profile';

export const SITE = 'https://svargabalimassage.com/';
export const ABOUT = 'https://svargabalimassage.com/about';

export function svargaProfile(): Profile {
  return {
    schemaVersion: 1,
    siteUrl: SITE,
    readAt: '2026-10-24T09:00:00.000Z',
    pagesRead: [SITE, ABOUT],
    thin: false,
    name: { value: 'Svarga', source: SITE },
    summary: { value: 'Mobile massage at your villa or hotel in Bali', source: SITE },
    category: 'massage spa',
    offerings: [
      {
        name: 'Balinese massage',
        description: 'Traditional full-body massage',
        price: 'IDR 450,000',
        duration: '90 minutes',
        source: SITE,
      },
    ],
    highlights: [{ value: 'Therapists come to you', source: ABOUT }],
    location: {
      town: { value: 'Canggu', source: SITE },
      area: { value: 'Bali', source: SITE },
      address: null,
      serviceArea: { value: 'Canggu, Seminyak and Ubud', source: ABOUT },
    },
    contact: {
      whatsapp: { value: '+6281234567890', source: SITE },
      phone: null,
      email: { value: 'hello@svargabalimassage.com', source: ABOUT },
      instagram: { value: 'svarga.bali', source: SITE },
      bookingUrl: null,
    },
    hours: { value: 'Every day, 9am to 10pm', source: SITE },
    tone: ['calm', 'warm', 'caring'],
    colours: [
      { hex: '#1f6f5c', role: 'primary', source: 'theme-color' },
      { hex: '#ffffff', role: 'background', source: 'css:--color-bg' },
    ],
    logoUrl: { value: 'https://svargabalimassage.com/logo.png', source: SITE },
    essence: {
      feeling: ['relaxing', 'warm', 'cared for'],
      placeSymbols: ['frangipani', 'temple offerings'],
      senses: ['warm coconut oil', 'villa deck at sunset'],
      moments: [{ value: 'after a surf in Canggu', source: SITE }],
    },
    visualStyle: {
      summary: 'warm tropical, soft light, natural textures',
      palette: 'jade green, sand, white',
      light: 'soft daylight',
      textures: 'linen, wood, leaves',
      mood: 'calm and restorative',
    },
    photoUrls: ['https://svargabalimassage.com/hero.jpg'],
    promptVersion: 'brand-1',
    dropped: [],
  };
}

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
      promise: {
        value: 'Therapists bring the massage to your villa: message us and relax',
        source: SITE,
      },
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

export const SEN_SITE = 'https://sendanangmassage.com/';
export const SEN_CONTACT = 'https://sendanangmassage.com/contact';

// Sen's profile, with the values of tests/fixtures/sites/sen/expected.json.
export function senProfile(): Profile {
  const base = svargaProfile();
  return {
    ...base,
    siteUrl: SEN_SITE,
    pagesRead: [SEN_SITE, SEN_CONTACT],
    name: { value: 'Sen', source: SEN_SITE },
    summary: { value: 'Massage at your hotel, apartment or villa in Da Nang', source: SEN_SITE },
    offerings: [
      { name: 'Vietnamese Traditional Massage', source: SEN_SITE },
      { name: 'Foot Reflexology', source: SEN_SITE },
    ],
    highlights: [{ value: 'Therapists come to you', source: SEN_SITE }],
    location: {
      town: { value: 'Da Nang', source: SEN_CONTACT },
      area: null,
      address: null,
      serviceArea: null,
    },
    contact: {
      whatsapp: { value: '+84898661224', source: SEN_CONTACT },
      phone: null,
      email: null,
      instagram: null,
      bookingUrl: null,
    },
    hours: { value: 'Every day, 10am to 11pm', source: SEN_CONTACT },
    colours: [{ hex: '#4a6b53', role: 'primary', source: 'theme-color' }],
    logoUrl: null,
    essence: {
      promise: {
        value: 'Our therapists come to your hotel, apartment or villa: book on WhatsApp and relax',
        source: SEN_SITE,
      },
      feeling: ['relaxing', 'warm', 'cared for'],
      placeSymbols: ['lotus flowers', 'My Khe beach at dusk'],
      senses: ['warm natural oils', 'soft hotel lighting'],
      moments: [{ value: 'after a surf at My Khe', source: SEN_SITE }],
    },
    photoUrls: [],
  };
}

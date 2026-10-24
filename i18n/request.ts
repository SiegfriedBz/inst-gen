import { getRequestConfig } from 'next-intl/server';

// English only until platform/i18n (roadmap 0.6) adds the other languages.
export default getRequestConfig(async () => ({
  locale: 'en',
  messages: (await import('../messages/en.json')).default,
}));

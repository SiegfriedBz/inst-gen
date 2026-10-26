import { defineConfig, devices } from '@playwright/test';

// Test values, not secrets: the same ones CI sets.
const testEnv = {
  PILOT_PASSPHRASES:
    process.env.PILOT_PASSPHRASES ??
    'test-lotus-river-sen,test-blue-wave-svarga,test-quiet-stone-dev',
  SESSION_SECRET: process.env.SESSION_SECRET ?? 'test-session-secret-not-for-production-0001',
  GOOGLE_IMAGE_API_KEY: 'test-image-key-not-real',
};

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
  projects: [{ name: 'phone', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: 'pnpm build && pnpm start',
    url: 'http://localhost:3000/robots.txt',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: testEnv,
  },
});

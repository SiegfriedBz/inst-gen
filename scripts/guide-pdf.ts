// Writes the owner guide as three A4 PDFs, one per language, under
// .superpowers/guide/, outside git, for the pilot handover
// (docs/specs/guide/owner-guide, "Printable PDF"). It builds this checkout,
// starts it with the test passphrases, prints /guide with Playwright's
// Chromium and stops the server. The contact line comes from GUIDE_CONTACT
// in .env.local, if set. No model is called.
//
// Usage: pnpm guide:pdf
import { type ChildProcess, execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { LOCALE_COOKIE, LOCALES } from '@/lib/i18n/locale';
import { testEnv } from '../playwright.config';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const PORT = 3000;
const BASE = `http://localhost:${PORT}`;
// The developer's test passphrase from playwright.config.ts; not a secret.
const DEV = 'test-quiet-stone-dev';
const OUT = join('.superpowers', 'guide');

function portInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: 'localhost' });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

async function waitForServer(timeoutMs: number): Promise<void> {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try {
      if ((await fetch(`${BASE}/robots.txt`)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`the app didn't start on ${BASE}`);
}

const pageCount = (pdf: Buffer) => pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length ?? 0;

async function main(): Promise<void> {
  if (await portInUse(PORT)) {
    throw new Error(`port ${PORT} is in use: stop that server first, so this checkout is printed`);
  }
  const env = { ...process.env, ...testEnv, GUIDE_CONTACT: process.env.GUIDE_CONTACT ?? '' };
  execSync('pnpm build', { stdio: 'inherit', env });
  let server: ChildProcess | undefined;
  const browser = await chromium.launch();
  try {
    server = spawn('pnpm', ['start'], { env, stdio: 'ignore', detached: true });
    await waitForServer(60_000);
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/enter`);
    await page.locator('#passphrase').fill(DEV);
    await page.locator('button[type=submit]:not([name=locale])').click();
    await page.waitForURL(`${BASE}/`);
    mkdirSync(OUT, { recursive: true });
    for (const locale of LOCALES) {
      await context.addCookies([{ name: LOCALE_COOKIE, value: locale, url: BASE }]);
      await page.goto(`${BASE}/guide`);
      await page.emulateMedia({ media: 'print' });
      const path = join(OUT, `shopfront-guide-${locale}.pdf`);
      const pdf = await page.pdf({ format: 'A4', preferCSSPageSize: true });
      writeFileSync(path, pdf);
      console.log(`${path}: ${pageCount(pdf)} pages`);
    }
  } finally {
    await browser.close();
    // pnpm start runs next in its own group: stop the whole group.
    if (server?.pid) process.kill(-server.pid, 'SIGTERM');
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

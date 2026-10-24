// Saves a site fixture with the real reader, so the fixture is exactly what
// the reader saw. No model call.
//
// Usage: pnpm fixtures:save <url> <slug>
import { saveFixture } from '@/lib/brand/fixtures';

const [url, slug] = process.argv.slice(2);
if (!url || !slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('Usage: pnpm fixtures:save <url> <slug>   (slug: lowercase letters, digits, -)');
  process.exit(1);
}

try {
  const manifest = await saveFixture(url, slug);
  const pages = manifest.files.filter((f) => f.path.startsWith('pages/')).length;
  const sheets = manifest.files.filter((f) => f.path.startsWith('css/')).length;
  console.log(
    `${slug}: ${pages} page(s), ${sheets} stylesheet(s), ${manifest.images.length} image(s) cached`,
  );
  console.log('Now write expected.json from the saved pages.');
} catch (error) {
  console.error(`${slug}: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

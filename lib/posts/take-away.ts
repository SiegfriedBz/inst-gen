import { dayOf } from './day';

// Getting a post out of the app (docs/specs/posts/editor-download, "Taking it
// away"): its words to the clipboard, its images to the phone's Photos
// through the share sheet on an iPhone, or a plain download anywhere else.

// `Sen Đà Nẵng Spa!` → `sen-da-nang-spa`: plain ASCII, the same on every phone.
function slug(name: string): string {
  const folded = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return folded || 'shopfront';
}

// `sen-2026-10-26-attempt-2-suggestion-3-post.jpg`, dated by the attempt's
// day (docs/specs/posts/suggestions, "Image file names";
// docs/specs/platform/one-daily-reset).
export function imageFileName(
  name: string,
  createdAt: string,
  attempt: number,
  n: number,
  kind: 'post' | 'story',
): string {
  return `${slug(name)}-${dayOf(createdAt)}-attempt-${attempt}-suggestion-${n}-${kind}.jpg`;
}

// False when the phone refuses the clipboard: the caller shows the text to
// copy by hand.
export async function copyToClipboard(
  text: string,
  clipboard: Pick<Clipboard, 'writeText'> | undefined = globalThis.navigator?.clipboard,
): Promise<boolean> {
  if (!clipboard) return false;
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// An iPhone or iPad, whose share sheet has "Save Image" and whose downloads
// land in Files, where Instagram doesn't look. iPadOS says it's a Mac; touch
// tells them apart.
function sharesToPhotos(nav: Navigator): boolean {
  const agent = nav.userAgent ?? '';
  return /iPhone|iPad|iPod/.test(agent) || (/Macintosh/.test(agent) && nav.maxTouchPoints > 1);
}

// On an iPhone, a suggestion's two images in one share sheet, post first, so
// the owner picks "Save 2 images" once. Anywhere else, one download each:
// Android's share sheet has no "save", and its downloads show in Instagram's
// gallery (docs/specs/posts/suggestions, amended 2026-10-27).
export async function saveImageFiles(
  files: { blob: Blob; name: string }[],
  env: { navigator: Navigator; document: Document } = { navigator, document },
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const named = files.map(({ blob, name }) => new File([blob], name, { type: 'image/jpeg' }));
  if (sharesToPhotos(env.navigator) && env.navigator.canShare?.({ files: named })) {
    try {
      await env.navigator.share({ files: named });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // A share sheet that fails for another reason: download instead.
    }
  }
  for (const file of named) {
    const url = URL.createObjectURL(file);
    const link = env.document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }
  return 'downloaded';
}

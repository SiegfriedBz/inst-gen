import { dayOf } from './day';

// Getting a post out of the app (docs/specs/posts/editor-download, "Taking it
// away"): its words to the clipboard, its images to the phone's Photos
// through the share sheet, or a plain download where files can't be shared.

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

// A suggestion's two images in one share sheet, post first, so the owner
// picks "Save 2 images" once; one download each where files can't be shared.
export async function saveImageFiles(
  files: { blob: Blob; name: string }[],
  env: { navigator: Navigator; document: Document } = { navigator, document },
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const named = files.map(({ blob, name }) => new File([blob], name, { type: 'image/jpeg' }));
  if (env.navigator.canShare?.({ files: named })) {
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

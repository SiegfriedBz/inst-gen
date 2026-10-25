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

export function imageFileName(
  name: string,
  createdAt: string,
  n: number,
  kind: 'post' | 'story',
): string {
  return `${slug(name)}-${localDate(createdAt)}-${n}-${kind}.jpg`;
}

// The batch's day on the phone's own clock, not in UTC: a batch made at 6:30
// in Da Nang is that day's.
function localDate(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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

export async function saveImageFile(
  blob: Blob,
  fileName: string,
  env: { navigator: Navigator; document: Document } = { navigator, document },
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], fileName, { type: 'image/jpeg' });
  if (env.navigator.canShare?.({ files: [file] })) {
    try {
      await env.navigator.share({ files: [file] });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // A share sheet that fails for another reason: download instead.
    }
  }
  const url = URL.createObjectURL(file);
  const link = env.document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
  return 'downloaded';
}

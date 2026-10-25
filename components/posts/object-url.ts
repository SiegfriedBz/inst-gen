'use client';

import { useEffect, useState } from 'react';

// One object URL per image blob, shared by everyone showing it, so a card and
// its feed tile show the same picture without reading or decoding it twice on
// a slow phone (docs/specs/posts/editor-download, "The feed preview"). The
// URL is revoked when the last one stops showing it.
const shared = new Map<Blob, { url: string; users: number }>();

function take(blob: Blob): string {
  const entry = shared.get(blob) ?? { url: URL.createObjectURL(blob), users: 0 };
  entry.users += 1;
  shared.set(blob, entry);
  return entry.url;
}

function release(blob: Blob): void {
  const entry = shared.get(blob);
  if (!entry) return;
  entry.users -= 1;
  if (entry.users > 0) return;
  shared.delete(blob);
  URL.revokeObjectURL(entry.url);
}

export function useObjectUrl(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    setUrl(take(blob));
    return () => release(blob);
  }, [blob]);
  return url;
}

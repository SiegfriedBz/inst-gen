'use client';

import { useEffect } from 'react';

// While the bottom bar shows, the field the owner types in scrolls just clear
// of it: when it takes focus, and when the page shrinks as an Android
// keyboard opens (docs/specs/platform/friendlier-home, changed 2026-11-20).
// The page's scroll-padding-bottom (app/globals.css) is the bar's room.

const NOT_TEXT = new Set([
  'checkbox',
  'radio',
  'button',
  'submit',
  'reset',
  'file',
  'color',
  'range',
]);

function isTextField(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (el instanceof HTMLTextAreaElement) return true;
  return el instanceof HTMLInputElement && !NOT_TEXT.has(el.type);
}

export function useFieldAboveBar(): void {
  useEffect(() => {
    const keep = () => {
      const el = document.activeElement;
      // "Nearest" moves the page only as far as the field needs.
      if (isTextField(el)) el.scrollIntoView?.({ block: 'nearest' });
    };
    document.addEventListener('focusin', keep);
    window.addEventListener('resize', keep);
    return () => {
      document.removeEventListener('focusin', keep);
      window.removeEventListener('resize', keep);
    };
  }, []);
}

'use client';

import { useEffect, useState } from 'react';

// True while the owner types in a text field: on a phone, that's when the
// on-screen keyboard is up. The bottom tab bar hides then, so it never covers
// the field (docs/specs/platform/friendlier-home, "The tabs move to a bottom
// bar"). Focus, not the viewport's size: Android Chrome shrinks the window and
// the visual viewport together when the keyboard opens, so sizes can't tell.

const NOT_TEXT = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'color']);

function isTextField(el: Element | null): boolean {
  if (el instanceof HTMLTextAreaElement) return true;
  return el instanceof HTMLInputElement && !NOT_TEXT.has(el.type);
}

export function useTyping(): boolean {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const check = () => setTyping(isTextField(document.activeElement));
    // Focus leaves before it lands on the next element: check once it has.
    const later = () => setTimeout(check, 0);
    document.addEventListener('focusin', check);
    document.addEventListener('focusout', later);
    return () => {
      document.removeEventListener('focusin', check);
      document.removeEventListener('focusout', later);
    };
  }, []);
  return typing;
}

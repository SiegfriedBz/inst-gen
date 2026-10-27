'use client';

import { useEffect, useState } from 'react';

// True while the owner types with the on-screen keyboard up: a text field has
// focus and the visible part of the page is well short of the window. The
// bottom tab bar hides then, so it never covers the field
// (docs/specs/platform/friendlier-home, "The tabs move to a bottom bar").
// False where the browser doesn't report the visible part.

const TEXT_INPUTS = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'color']);

function isTextField(el: Element | null): boolean {
  if (el instanceof HTMLTextAreaElement) return true;
  return el instanceof HTMLInputElement && !TEXT_INPUTS.has(el.type);
}

export function useTyping(): boolean {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const check = () =>
      setTyping(isTextField(document.activeElement) && viewport.height < window.innerHeight * 0.75);
    // Focus leaves before it lands on the next element: check once it has.
    const later = () => setTimeout(check, 0);
    viewport.addEventListener('resize', check);
    document.addEventListener('focusin', check);
    document.addEventListener('focusout', later);
    return () => {
      viewport.removeEventListener('resize', check);
      document.removeEventListener('focusin', check);
      document.removeEventListener('focusout', later);
    };
  }, []);
  return typing;
}

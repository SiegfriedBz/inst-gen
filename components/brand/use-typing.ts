'use client';

import { useEffect, useState } from 'react';

// True while the owner types in a text field: on a phone, that's when the
// on-screen keyboard is up. The bottom tab bar hides then, so it never covers
// the field (docs/specs/platform/friendlier-home, "The tabs move to a bottom
// bar"). Focus, not the viewport's size: Android Chrome shrinks the window and
// the visual viewport together when the keyboard opens, so sizes can't tell.

const NOT_TEXT = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'color']);
// How long the bar waits to come back once focus leaves a field: the tap
// that took focus away (on "Write 2 replies", say) must land before the bar
// reappears under the finger.
const BACK_AFTER_MS = 300;

function isTextField(el: Element | null): boolean {
  if (el instanceof HTMLTextAreaElement) return true;
  return el instanceof HTMLInputElement && !NOT_TEXT.has(el.type);
}

export function useTyping(): boolean {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = () => setTyping(isTextField(document.activeElement));
    // Hides at once; shows again only once focus has stayed off a field.
    const onIn = () => {
      if (!isTextField(document.activeElement)) return;
      clearTimeout(timer);
      setTyping(true);
    };
    const onOut = () => {
      clearTimeout(timer);
      timer = setTimeout(check, BACK_AFTER_MS);
    };
    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('focusin', onIn);
      document.removeEventListener('focusout', onOut);
    };
  }, []);
  return typing;
}

// Kept apart from actions.ts: a 'use server' file may export async functions only.
export type SignInState = { error: boolean; attempt: number };

// Slows down guessing; there is no attempt limit until phase 4.
export const WRONG_PASSPHRASE_DELAY_MS = 1000;

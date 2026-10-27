import type { PostsErrorCode } from './batch';

// One line in the server log per post plan or rewrite, like the brand read's
// (lib/brand/read-log.ts). It never holds a caption or anything the owner
// typed (docs/specs/posts/generate-copy, "Failures").

export type PostsLog = {
  host: string;
  kind: 'plan' | 'rewrite';
  model: string;
  promptVersion: string;
  // Posts in the final line, and flags across them.
  kept: number;
  flags: number;
  // Code's fixes to the story texts and a spa's emojis
  // (docs/specs/posts/story-text): counts only, never the text.
  storyCuts: number;
  emojiFixes: number;
  // null when the step ended before the model answered.
  modelMs: number | null;
  totalMs: number;
  outcome: 'final' | 'aborted' | PostsErrorCode;
  error?: string;
};

const ERROR_CHARS = 300;

export function formatPostsLog(log: PostsLog): string {
  const fields = [
    `host=${log.host}`,
    `kind=${log.kind}`,
    `model=${log.model}`,
    `prompt=${log.promptVersion}`,
    `kept=${log.kept}`,
    `flags=${log.flags}`,
    `story_cuts=${log.storyCuts}`,
    `emoji_fixes=${log.emojiFixes}`,
    `model_ms=${log.modelMs ?? '-'}`,
    `total_ms=${log.totalMs}`,
    `outcome=${log.outcome}`,
  ];
  if (log.error !== undefined) {
    const message = log.error.replace(/\s+/g, ' ').slice(0, ERROR_CHARS);
    fields.push(`error="${message.replaceAll('"', '\\"')}"`);
  }
  return `posts ${fields.join(' ')}`;
}

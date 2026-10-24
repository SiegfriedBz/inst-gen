#!/usr/bin/env node
// Copies .agents/skills to .claude/skills from what is staged (the git index),
// not from the disk, then stages the copy. Run by the pre-commit hook.
//
// Usage: node scripts/sync-skills.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SOURCE = '.agents/skills/';
const TARGET = '.claude/skills/';

const git = (args, options = {}) =>
  execFileSync('git', args, { maxBuffer: 64 * 1024 * 1024, ...options });

const staged = git(['ls-files', '-z', '--cached', '--', SOURCE], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

rmSync(TARGET, { recursive: true, force: true });
for (const file of staged) {
  const target = join(TARGET, file.slice(SOURCE.length));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, git(['show', `:${file}`]));
}
mkdirSync(TARGET, { recursive: true });

git(['add', '--all', '--', TARGET]);
console.log(`synced ${staged.length} file(s) from ${SOURCE} to ${TARGET}`);

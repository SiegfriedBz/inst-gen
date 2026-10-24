#!/usr/bin/env node
// Checks the repo itself. It fails when:
// - .claude/skills is not identical to .agents/skills;
// - a skill has no valid frontmatter, or its description is too long or has < or >;
// - a file path cited in AGENTS.md or README.md doesn't exist.
//
// Usage: node scripts/check-repo.mjs [repo root]
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.argv[2] ?? '.';
const MAX_DESCRIPTION = 1024;
// Paths the docs cite on purpose although they must not exist.
const ABSENT_ON_PURPOSE = ['docs/superpowers/'];
const problems = [];

function files(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

// 1. .claude/skills mirrors .agents/skills.
const source = join(root, '.agents/skills');
const copy = join(root, '.claude/skills');
const sourceFiles = new Set(files(source).map((f) => relative(source, f)));
const copyFiles = new Set(files(copy).map((f) => relative(copy, f)));
for (const file of sourceFiles) {
  if (!copyFiles.has(file))
    problems.push(`.claude/skills/${file}: missing (run node scripts/sync-skills.mjs)`);
  else if (!readFileSync(join(source, file)).equals(readFileSync(join(copy, file)))) {
    problems.push(`.claude/skills/${file}: differs from .agents/skills/${file}`);
  }
}
for (const file of copyFiles) {
  if (!sourceFiles.has(file)) problems.push(`.claude/skills/${file}: not in .agents/skills`);
}

// 2. Every skill has a valid frontmatter.
const skills = [...sourceFiles].filter((f) => f.endsWith('/SKILL.md'));
for (const file of skills) {
  const name = `.agents/skills/${file}`;
  const text = readFileSync(join(source, file), 'utf8').replace(/\r\n/g, '\n');
  const frontmatter = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)?.[1];
  if (frontmatter === undefined) {
    problems.push(`${name}: no frontmatter`);
    continue;
  }
  if (!/^name:\s*\S/m.test(frontmatter)) problems.push(`${name}: no name`);
  const description = frontmatter
    .match(/^description:\s*(.*)$/m)?.[1]
    ?.trim()
    .replace(/^["']|["']$/g, '');
  if (!description) problems.push(`${name}: no description`);
  else {
    if (description.length > MAX_DESCRIPTION) {
      problems.push(
        `${name}: description is ${description.length} characters, max ${MAX_DESCRIPTION}`,
      );
    }
    if (/[<>]/.test(description)) problems.push(`${name}: description contains < or >`);
  }
}

// 3. Every repo path cited in AGENTS.md and README.md exists.
// A cited path is inline code that starts with a top-level entry of the repo
// and has no placeholder (<…>, NNNN, *).
const topLevel = new Set(readdirSync(root));
for (const doc of ['AGENTS.md', 'README.md']) {
  const path = join(root, doc);
  if (!existsSync(path)) continue;
  for (const [, cited] of readFileSync(path, 'utf8').matchAll(/`([^`\s]+)`/g)) {
    const first = cited.replace(/^\.\//, '').split('/')[0];
    if (!topLevel.has(first) || /[<>*]|NNNN/.test(cited) || ABSENT_ON_PURPOSE.includes(cited))
      continue;
    if (!existsSync(join(root, cited)))
      problems.push(`${doc}: cites ${cited}, which doesn't exist`);
  }
}

for (const problem of problems) console.error(`✗ ${problem}`);
console.log(
  `${problems.length === 0 ? 'ok' : `${problems.length} problem(s)`}: checked ${skills.length} skill(s), ${sourceFiles.size} skill file(s) mirrored`,
);
process.exit(problems.length === 0 ? 0 : 1);

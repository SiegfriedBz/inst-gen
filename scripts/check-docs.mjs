#!/usr/bin/env node
// Checks the specs and decisions under docs/. It fails when:
// - a spec or decision has no frontmatter, or a status outside draft, approved, deprecated;
// - one is approved without saying who approved it and when, or was approved by an agent;
// - a decision is missing one of its required headings.
// It cannot prove a person approved anything: it only makes a missing approval visible.
//
// Usage: node scripts/check-docs.mjs [repo root]
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

const root = process.argv[2] ?? '.';
const STATUSES = ['draft', 'approved', 'deprecated'];
// The address Claude Code signs its commits with: never a person.
const AGENT_EMAILS = ['noreply@anthropic.com'];
const DECISION_HEADINGS = [
  '## Context and Problem Statement',
  '## Considered Options',
  '## Decision Outcome',
  '### Consequences',
  '### Confirmation',
];

function markdownFiles(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.name.endsWith('.md') ? [path] : [];
  });
}

const specs = markdownFiles(join(root, 'docs/specs')).filter((f) => basename(f) === 'spec.md');
const decisions = markdownFiles(join(root, 'docs/decisions')).filter((f) =>
  /^\d{4}-.+\.md$/.test(basename(f)),
);
const problems = [];

for (const file of [...specs, ...decisions]) {
  const name = relative(root, file);
  // A Windows checkout may turn line endings into CRLF.
  const text = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const frontmatter = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)?.[1];
  if (frontmatter === undefined) {
    problems.push(`${name}: no frontmatter`);
    continue;
  }

  const status = frontmatter.match(/^status:\s*["']?(\w+)["']?\s*$/m)?.[1];
  if (!STATUSES.includes(status)) {
    problems.push(`${name}: status is ${status ?? 'missing'}, expected ${STATUSES.join(', ')}`);
  }

  if (status === 'approved') {
    const approval = frontmatter.match(
      /^approved:\s*\{\s*by:\s*["']?([^"',}\s]+)["']?\s*,\s*at:\s*["']?(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?Z)["']?\s*\}\s*$/m,
    );
    if (!approval) {
      problems.push(`${name}: approved, but no line "approved: { by: <email>, at: <UTC time> }"`);
    } else if (AGENT_EMAILS.includes(approval[1])) {
      problems.push(`${name}: approved by ${approval[1]}, an agent and not a person`);
    }
  }

  if (decisions.includes(file)) {
    const lines = text.split('\n').map((line) => line.trim());
    for (const heading of DECISION_HEADINGS) {
      if (!lines.includes(heading)) problems.push(`${name}: missing heading "${heading}"`);
    }
  }
}

for (const problem of problems) console.error(`✗ ${problem}`);
console.log(
  `${problems.length === 0 ? 'ok' : `${problems.length} problem(s)`}: checked ${specs.length} spec(s) and ${decisions.length} decision(s)`,
);
process.exit(problems.length === 0 ? 0 : 1);

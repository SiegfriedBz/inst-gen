// The read that starts by itself (docs/specs/platform/easier-to-use) starts
// once per page load and owner: module state outlives the home screen's
// remounts (the guide and back) and ends with the page.
const taken = new Set<string>();

// True the first time for an owner in this page load, false after. A tap on
// "Read my website" takes it too.
export function takeAutoRead(ownerId: string): boolean {
  if (taken.has(ownerId)) return false;
  taken.add(ownerId);
  return true;
}

export function resetAutoReadForTests(): void {
  taken.clear();
}

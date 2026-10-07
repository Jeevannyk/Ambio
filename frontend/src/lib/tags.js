/*
 * Tag primitives shared by the picker and the tasks page. A tag is a bare
 * string — the name is the identity — so every consumer has to agree on how
 * names are normalized, compared and coloured.
 */

export const DEFAULT_TAGS = ['Priority', 'Work', 'Family', 'Deadline'];

// What actually gets stored: trimmed, with internal runs of space collapsed.
export const normalizeTag = (name) => String(name ?? '').trim().replace(/\s+/g, ' ');

// Two tags are the same tag when they only differ in case or spacing.
export const tagKey = (name) => normalizeTag(name).toLowerCase();

/*
 * One display list out of several sources (the saved vocabulary, the tags in
 * use on tasks): deduped by key with the first spelling winning, sorted by
 * locale — a plain .sort() would file 'Work' before 'apple'.
 */
export function mergeTags(...lists) {
  const seen = new Map();
  for (const list of lists) {
    for (const name of list || []) {
      const key = tagKey(name);
      if (key && !seen.has(key)) seen.set(key, normalizeTag(name));
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

// Hues that stay legible on --surface at the dot's saturation/lightness.
const TAG_HUES = [4, 32, 46, 96, 152, 190, 258, 320];

// A stable hue hashed from the name: no colour to pick, none to store.
export function hueFor(name) {
  let h = 0;
  for (const c of tagKey(name)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TAG_HUES[h % TAG_HUES.length];
}

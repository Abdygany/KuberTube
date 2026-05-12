/**
 * Returns a filesystem-safe slug. Keeps ASCII letters/digits and
 * Cyrillic letters, replaces every other character with `-`, collapses
 * runs, trims, and caps length.
 */
export function slugify(title: string, options: { maxLen?: number } = {}): string {
  const maxLen = options.maxLen ?? 60;
  const collapsed = title
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLen);
  return collapsed || "untitled";
}

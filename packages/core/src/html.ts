const ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#39": "'",
};

/** Decodes the small set of named entities that providers return in titles/descriptions. */
export function decodeHtmlEntities(input: string): string {
  return input.replace(/&([a-zA-Z]+|#\d+);/g, (_, name: string) => {
    if (name.startsWith("#")) {
      const code = Number(name.slice(1));
      return Number.isFinite(code) ? String.fromCharCode(code) : `&${name};`;
    }
    return ENTITY_MAP[name] ?? `&${name};`;
  });
}

/** Strips literal HTML tags. Use only on already-sanitized input. */
export function stripHtmlTags(input: string): string {
  return input.replace(/<\/?[^>]+>/g, "");
}

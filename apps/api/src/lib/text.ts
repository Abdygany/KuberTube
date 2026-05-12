/**
 * Tiny HTML → plaintext / markdown converters for AI summary input
 * and workspace markdown export. Deliberately not pulling in
 * `turndown` (60kB + transitive jsdom we already have for reader
 * but don't want for export) — these handle the small surface of
 * tags that TipTap + Mozilla Readability emit.
 */

const ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#39": "'",
};

function decodeEntities(input: string): string {
  return input.replace(/&([a-zA-Z]+|#\d+);/g, (_, name: string) => {
    if (name.startsWith("#")) {
      const code = Number(name.slice(1));
      return Number.isFinite(code) ? String.fromCharCode(code) : `&${name};`;
    }
    return ENTITY_MAP[name] ?? `&${name};`;
  });
}

/** Strips HTML, collapses whitespace, decodes entities. Loses formatting. */
export function htmlToPlainText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h[1-6]|li|blockquote|figcaption)>/gi, "\n\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Lossy HTML → markdown. Good enough for note export, not a general converter. */
export function htmlToMarkdown(html: string): string {
  let out = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  out = out.replace(/<br\s*\/?>/gi, "\n");
  out = out.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level: string, body: string) => {
    const hashes = "#".repeat(Number(level));
    return `\n\n${hashes} ${body.trim()}\n\n`;
  });
  out = out.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, body: string) => {
    return body
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n");
  });
  out = out.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**");
  out = out.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, "*$2*");
  out = out.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");
  out = out.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "\n```\n$1\n```\n");
  out = out.replace(
    /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_, href: string, body: string) => `[${body.trim()}](${href})`,
  );
  out = out.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n");
  out = out.replace(/<\/(p|div)>/gi, "\n\n");
  out = out.replace(/<[^>]+>/g, "");
  out = decodeEntities(out);
  return out
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Hard-truncates `text` at `maxChars`, backing up to the previous
 * paragraph or sentence break within 500 chars so the cut isn't
 * mid-sentence. Used to bound Anthropic input cost.
 */
export function truncateAtBoundary(text: string, maxChars: number): {
  text: string;
  truncated: boolean;
} {
  if (text.length <= maxChars) return { text, truncated: false };
  const hard = text.slice(0, maxChars);
  const window = hard.slice(Math.max(0, hard.length - 500));
  const lastPara = window.lastIndexOf("\n\n");
  const lastSentence = window.lastIndexOf(". ");
  const bestRelative = Math.max(lastPara, lastSentence);
  if (bestRelative === -1) return { text: hard, truncated: true };
  const offset = hard.length - 500 + bestRelative;
  return { text: hard.slice(0, offset + (lastPara === bestRelative ? 2 : 2)), truncated: true };
}

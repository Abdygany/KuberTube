import "server-only";

import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: true });

const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "hr",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "em", "strong", "i", "b", "u",
  "a", "img", "figure", "figcaption",
  "table", "thead", "tbody", "tr", "th", "td",
  "div", "span",
];
const ALLOWED_ATTR = ["href", "src", "alt", "title", "loading", "referrerpolicy", "target", "rel"];

/**
 * Renders user-supplied markdown to safe HTML. Used for AI summary
 * display. DOMPurify's URI scheme allowlist drops `javascript:` and
 * `data:` automatically.
 */
export function renderMarkdownToSafeHtml(md: string): string {
  const rawHtml = marked.parse(md, { async: false }) as string;
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "style", "link"],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitizes TipTap-emitted HTML for storage. TipTap parses through
 * a schema-restricted pipeline client-side, but a malicious client
 * could POST raw HTML directly. Keep the allowlist tight; we render
 * back through TipTap on read and never inject the stored HTML
 * with `dangerouslySetInnerHTML`, but exports go through
 * `htmlToMarkdown` so server-side sanitization is the durable
 * defense.
 */
export function sanitizeNoteHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "hr",
      "ul", "ol", "li",
      "blockquote", "pre", "code",
      "em", "strong", "i", "b", "u",
      "a",
      "h1", "h2", "h3", "h4", "h5", "h6",
    ],
    ALLOWED_ATTR: ["href", "title"],
    ALLOWED_URI_REGEXP: /^(https?:|mailto:|#|\/)/i,
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "style", "link", "img"],
    ALLOW_DATA_ATTR: false,
  });
}

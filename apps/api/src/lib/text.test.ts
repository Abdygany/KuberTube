import { describe, expect, it } from "vitest";
import { htmlToMarkdown, htmlToPlainText, truncateAtBoundary } from "./text";

describe("htmlToPlainText", () => {
  it("strips tags and decodes entities", () => {
    expect(htmlToPlainText("<p>Hello &amp; goodbye</p>")).toBe(
      "Hello & goodbye",
    );
  });
  it("drops scripts and styles entirely", () => {
    expect(
      htmlToPlainText("<script>alert(1)</script>visible<style>x{}</style>"),
    ).toBe("visible");
  });
  it("collapses whitespace", () => {
    expect(htmlToPlainText("<p>a\n\n\n\nb</p>")).toBe("a\n\nb");
  });
  it("turns <br> into newline", () => {
    expect(htmlToPlainText("a<br>b")).toBe("a\nb");
  });
  it("turns <li> into '- '", () => {
    expect(htmlToPlainText("<ul><li>x</li><li>y</li></ul>")).toContain("- x");
  });
});

describe("htmlToMarkdown", () => {
  it("converts <strong> to **", () => {
    expect(htmlToMarkdown("<p><strong>bold</strong></p>")).toContain(
      "**bold**",
    );
  });
  it("converts <em> to *", () => {
    expect(htmlToMarkdown("<em>it</em>")).toContain("*it*");
  });
  it("converts <a href> to [text](url)", () => {
    expect(
      htmlToMarkdown('Visit <a href="https://example.com">site</a>'),
    ).toContain("[site](https://example.com)");
  });
  it("converts <h2> to ##", () => {
    expect(htmlToMarkdown("<h2>Title</h2>")).toContain("## Title");
  });
  it("turns <li> into '- ' bullets", () => {
    expect(htmlToMarkdown("<ul><li>x</li></ul>")).toMatch(/- x/);
  });
});

describe("truncateAtBoundary", () => {
  it("returns the input unchanged when under limit", () => {
    expect(truncateAtBoundary("hello", 100)).toEqual({
      text: "hello",
      truncated: false,
    });
  });
  it("flags truncated=true when over limit", () => {
    const result = truncateAtBoundary("a".repeat(200), 50);
    expect(result.truncated).toBe(true);
    expect(result.text.length).toBeLessThanOrEqual(50);
  });
  it("backs up to a sentence boundary", () => {
    const long =
      "First sentence. Second sentence. Third sentence. Fourth sentence stops here.";
    const result = truncateAtBoundary(long, 50);
    expect(result.truncated).toBe(true);
    expect(result.text.endsWith(". ")).toBe(true);
  });

  it("does not return empty when maxChars < 500 and a boundary exists", () => {
    // Regression: earlier code computed `hard.length - 500` directly,
    // produced a negative offset, and returned ""; now Math.max(0, …)
    // clamps and we return the full prefix.
    const text =
      "Short. With a few. Sentence boundaries. Trailing tail that is dropped.";
    const result = truncateAtBoundary(text, 50);
    expect(result.truncated).toBe(true);
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.text.length).toBeLessThanOrEqual(50);
  });
});

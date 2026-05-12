import { describe, expect, it } from "vitest";
import { canonicalUrl, parseIsoDuration } from "./search";

describe("canonicalUrl", () => {
  it("keeps http(s) URLs", () => {
    expect(canonicalUrl("https://example.com/path")).toBe("https://example.com/path");
  });
  it("rejects javascript: schemes", () => {
    expect(canonicalUrl("javascript:alert(1)")).toBe("");
  });
  it("rejects data: schemes", () => {
    expect(canonicalUrl("data:text/html,<script>alert(1)</script>")).toBe("");
  });
  it("rejects file: schemes", () => {
    expect(canonicalUrl("file:///etc/passwd")).toBe("");
  });
  it("strips utm_* tracking params", () => {
    expect(canonicalUrl("https://example.com/?utm_source=x&q=1")).toBe(
      "https://example.com/?q=1",
    );
  });
  it("strips fbclid / gclid / msclkid", () => {
    expect(canonicalUrl("https://example.com/?fbclid=abc&q=1")).toBe("https://example.com/?q=1");
    expect(canonicalUrl("https://example.com/?gclid=abc")).toBe("https://example.com/");
  });
  it("strips fragments", () => {
    expect(canonicalUrl("https://example.com/x#frag")).toBe("https://example.com/x");
  });
  it("lowercases hostname", () => {
    expect(canonicalUrl("https://EXAMPLE.com/x")).toBe("https://example.com/x");
  });
  it("trims trailing slash but keeps root", () => {
    expect(canonicalUrl("https://example.com/x/")).toBe("https://example.com/x");
    expect(canonicalUrl("https://example.com/")).toBe("https://example.com/");
  });
  it("returns empty for unparsable URLs", () => {
    expect(canonicalUrl("not a url")).toBe("");
  });
});

describe("parseIsoDuration", () => {
  it("parses minutes+seconds (PT4M13S)", () => {
    expect(parseIsoDuration("PT4M13S")).toBe(253);
  });
  it("parses hours+minutes+seconds (PT1H2M3S)", () => {
    expect(parseIsoDuration("PT1H2M3S")).toBe(3723);
  });
  it("parses just seconds (PT45S)", () => {
    expect(parseIsoDuration("PT45S")).toBe(45);
  });
  it("parses just minutes (PT10M)", () => {
    expect(parseIsoDuration("PT10M")).toBe(600);
  });
  it("returns null for malformed input", () => {
    expect(parseIsoDuration("4 minutes")).toBeNull();
    expect(parseIsoDuration("")).toBeNull();
    expect(parseIsoDuration(undefined)).toBeNull();
    expect(parseIsoDuration(null)).toBeNull();
  });
  it("returns null for zero duration", () => {
    expect(parseIsoDuration("PT0S")).toBeNull();
  });
});

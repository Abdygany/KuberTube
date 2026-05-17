import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("keeps ASCII letters/digits", () => {
    expect(slugify("Hello World 42")).toBe("hello-world-42");
  });
  it("keeps Cyrillic", () => {
    expect(slugify("Привет Мир")).toBe("привет-мир");
  });
  it("collapses runs", () => {
    expect(slugify("a   b    c")).toBe("a-b-c");
  });
  it("trims leading/trailing dashes", () => {
    expect(slugify("--xxx--")).toBe("xxx");
  });
  it("falls back to 'untitled'", () => {
    expect(slugify("!!!")).toBe("untitled");
    expect(slugify("")).toBe("untitled");
  });
  it("respects maxLen", () => {
    expect(slugify("a".repeat(200), { maxLen: 10 })).toHaveLength(10);
  });
});

import { describe, expect, it } from "vitest";
import { extractYouTubeId, httpsUrlSchema, normalizeHostname } from "./url";

describe("normalizeHostname", () => {
  it("strips IPv6 brackets", () => {
    expect(normalizeHostname("[::1]")).toBe("::1");
    expect(normalizeHostname("[fd00:ec2::254]")).toBe("fd00:ec2::254");
  });
  it("lowercases", () => {
    expect(normalizeHostname("ExAmPLE.com")).toBe("example.com");
  });
  it("leaves IPv4 alone", () => {
    expect(normalizeHostname("10.0.0.1")).toBe("10.0.0.1");
  });
});

describe("extractYouTubeId", () => {
  it("reads from metadata.videoId when valid", () => {
    expect(extractYouTubeId("https://example.com/x", { videoId: "dQw4w9WgXcQ" })).toBe(
      "dQw4w9WgXcQ",
    );
  });
  it("rejects malformed metadata.videoId and falls back to URL", () => {
    expect(
      extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ", { videoId: "nope" }),
    ).toBe("dQw4w9WgXcQ");
  });
  it("parses youtu.be short links", () => {
    expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("parses /shorts/", () => {
    expect(extractYouTubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("parses /embed/", () => {
    expect(extractYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("returns null for non-YouTube URLs", () => {
    expect(extractYouTubeId("https://example.com/video.mp4")).toBeNull();
  });
  it("returns null for garbage URLs", () => {
    expect(extractYouTubeId("not a url")).toBeNull();
  });
});

describe("httpsUrlSchema", () => {
  it("accepts https URLs", () => {
    expect(httpsUrlSchema.safeParse("https://example.com").success).toBe(true);
  });
  it("accepts http URLs", () => {
    expect(httpsUrlSchema.safeParse("http://example.com").success).toBe(true);
  });
  it("rejects javascript: URLs", () => {
    expect(httpsUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
  });
  it("rejects data: URLs", () => {
    expect(httpsUrlSchema.safeParse("data:text/plain,x").success).toBe(false);
  });
  it("rejects file: URLs", () => {
    expect(httpsUrlSchema.safeParse("file:///etc/passwd").success).toBe(false);
  });
  it("rejects non-URLs", () => {
    expect(httpsUrlSchema.safeParse("not a url").success).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { formatSeconds } from "./format";

describe("formatSeconds", () => {
  it("formats m:ss under an hour", () => {
    expect(formatSeconds(0)).toBe("0:00");
    expect(formatSeconds(7)).toBe("0:07");
    expect(formatSeconds(125)).toBe("2:05");
    expect(formatSeconds(3599)).toBe("59:59");
  });
  it("formats h:mm:ss past an hour", () => {
    expect(formatSeconds(3600)).toBe("1:00:00");
    expect(formatSeconds(3723)).toBe("1:02:03");
  });
  it("falls back to 0:00 for non-finite", () => {
    expect(formatSeconds(NaN)).toBe("0:00");
    expect(formatSeconds(Infinity)).toBe("0:00");
    expect(formatSeconds(-1)).toBe("0:00");
  });
});

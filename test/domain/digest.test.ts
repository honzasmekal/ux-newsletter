import { describe, it, expect } from "vitest";
import { assembleDigest } from "../../src/domain/digest";

describe("assembleDigest", () => {
  it("prázdno → empty=true", () => {
    const d = assembleDigest("2026-06-28", [], []);
    expect(d.empty).toBe(true);
  });
  it("legislativa + feed → empty=false, strop 10 celkem", () => {
    const feed = Array.from({ length: 20 }, (_, i) => ({
      title: `f${i}`, url: `u${i}`, source: "s", group: "B" as const,
      category: "trzni-kontext" as const, publishedAt: null, summary: "",
    }));
    const d = assembleDigest("2026-06-28", [], feed);
    expect(d.empty).toBe(false);
    expect(d.legislation.length + d.feed.length).toBeLessThanOrEqual(10);
  });
});

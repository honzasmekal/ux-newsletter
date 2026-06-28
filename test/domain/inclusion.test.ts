import { describe, it, expect } from "vitest";
import { passesInclusion } from "../../src/domain/inclusion";

describe("passesInclusion", () => {
  it("akční item projde", () =>
    expect(passesInclusion({ actionable: true, evidence: "blog", novel: false })).toBe(true));
  it("empirická studie projde i bez akčnosti", () =>
    expect(passesInclusion({ actionable: false, evidence: "empirická studie", novel: true })).toBe(true));
  it("recyklovaný názor bez akčnosti propadne", () =>
    expect(passesInclusion({ actionable: false, evidence: "blog", novel: false })).toBe(false));
});

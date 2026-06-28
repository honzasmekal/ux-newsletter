import { describe, it, expect } from "vitest";
import { renderDigest } from "../../src/domain/render";

describe("renderDigest", () => {
  it("obsahuje titulky legislativy i feedu", () => {
    const out = renderDigest({
      weekOf: "2026-06-28", empty: false,
      legislation: [{
        item: {
          id: "eaa", title: "EAA", effectiveDate: "2026-09-26", status: "schváleno",
          lastMaterialChange: null, remediationWeight: "těžká", firedFlags: [], confirmed: true,
        }, reason: "Termín za 90 dní", flag: "T-90",
      }],
      feed: [{
        title: "Allegro vstup", url: "https://x", source: "Lupa",
        group: "B", category: "trzni-kontext", publishedAt: null, summary: "...",
      }],
    });
    expect(out.html).toContain("EAA");
    expect(out.html).toContain("Allegro vstup");
    expect(out.text).toContain("EAA");
  });
});

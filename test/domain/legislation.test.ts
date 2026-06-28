import { describe, it, expect } from "vitest";
import {
  horizonsFor, daysUntil, tMinusFirings, proposeCandidates, computeLegislation,
} from "../../src/domain/legislation";
import type { TrackerItem, FeedItem } from "../../src/domain/types";

const base: TrackerItem = {
  id: "eaa", title: "EAA", effectiveDate: "2026-09-26", status: "schváleno",
  lastMaterialChange: null, remediationWeight: "těžká", firedFlags: [], confirmed: true,
};

describe("horizonsFor", () => {
  it("lehká → T-30, T-7", () => expect(horizonsFor("lehká")).toEqual([30, 7]));
  it("těžká → T-90, T-30, T-7", () => expect(horizonsFor("těžká")).toEqual([90, 30, 7]));
});

describe("daysUntil", () => {
  it("spočítá rozdíl dnů", () => expect(daysUntil("2026-07-08", "2026-06-28")).toBe(10));
  it("null effectiveDate → null", () => expect(daysUntil(null, "2026-06-28")).toBeNull());
});

describe("tMinusFirings", () => {
  it("překročený horizont T-90 → firing + nový flag", () => {
    const r = tMinusFirings(base, "2026-06-28"); // 90 dní do účinnosti
    expect(r.firings.map((f) => f.flag)).toContain("T-90");
    expect(r.newFlags).toContain("T-90");
  });
  it("už vypálený flag se neopakuje", () => {
    const r = tMinusFirings({ ...base, firedFlags: ["T-90"] }, "2026-06-28");
    expect(r.firings.find((f) => f.flag === "T-90")).toBeUndefined();
  });
  it("nepotvrzená položka nikdy nefiruje", () => {
    const r = tMinusFirings({ ...base, confirmed: false }, "2026-06-28");
    expect(r.firings).toHaveLength(0);
  });
  it("daleko od termínu → nic", () => {
    const r = tMinusFirings(base, "2025-01-01");
    expect(r.firings).toHaveLength(0);
  });
});

describe("proposeCandidates", () => {
  const tracker: TrackerItem[] = [base];
  it("group B nikdy nespustí materiální změnu", () => {
    const c = proposeCandidates(
      [{ title: "EAA výklad na blogu", url: "x", source: "eLegal", group: "B",
         category: "regulatorni", publishedAt: "2026-06-20", summary: "..." }],
      tracker,
    );
    expect(c.filter((x) => x.type === "update")).toHaveLength(0);
  });
  it("group A + zmínka existující položky → update kandidát s diffem", () => {
    const c = proposeCandidates(
      [{ title: "ČOI: nová kontrolní zpráva k EAA", url: "y", source: "ČOI", group: "A",
         category: "regulatorni", publishedAt: "2026-06-25", summary: "EAA vymáhání..." }],
      tracker,
    );
    const upd = c.find((x) => x.type === "update");
    expect(upd?.trackerId).toBe("eaa");
    expect(upd?.diff).toBeTruthy();
  });
  it("group A bez shody s trackerem → kandidát nová", () => {
    const c = proposeCandidates(
      [{ title: "Nový zákon o digitálních službách", url: "z", source: "Sbírka", group: "A",
         category: "regulatorni", publishedAt: "2026-06-25", summary: "..." }],
      tracker,
    );
    expect(c.some((x) => x.type === "nová")).toBe(true);
  });
});

describe("computeLegislation", () => {
  it("vrátí firing položky (jen potvrzené, suppression) + flagy k zápisu", () => {
    const items: TrackerItem[] = [
      base,
      { ...base, id: "x", confirmed: false },
    ];
    const r = computeLegislation(items, "2026-06-28");
    expect(r.firings.every((f) => f.item.confirmed)).toBe(true);
    expect(r.flagUpdates).toBeInstanceOf(Array);
  });
});

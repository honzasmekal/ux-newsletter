import { describe, it, expect, vi } from "vitest";
import { classify, type RawForClassify, type ClassifyDeps } from "../../src/adapters/classify";

const raw: RawForClassify[] = [
  { title: "EAA vymáhání", url: "a", source: "ČOI", group: "A", publishedAt: null, summary: "..." },
  { title: "Allegro vstup", url: "b", source: "Lupa", group: "B", publishedAt: null, summary: "..." },
];

describe("classify", () => {
  it("namapuje kategorie a signály z LLM odpovědi (zachová pořadí)", async () => {
    const deps: ClassifyDeps = {
      llmJson: vi.fn(async () => ({ items: [
        { category: "regulatorni", actionable: true, evidence: "blog", novel: true },
        { category: "trzni-kontext", actionable: false, evidence: "blog", novel: true },
      ] })),
    };
    const out = await classify(raw, deps);
    expect(out[0].category).toBe("regulatorni");
    expect(out[0].signals.actionable).toBe(true);
    expect(out[1].category).toBe("trzni-kontext");
  });

  it("nevalidní kategorie → bezpečný default", async () => {
    const deps: ClassifyDeps = {
      llmJson: vi.fn(async () => ({ items: [
        { category: "VYMYŠLENÁ", actionable: true, evidence: "blog", novel: true },
        { category: "ux-vyzkum", actionable: false, evidence: "empirická studie", novel: true },
      ] })),
    };
    const out = await classify(raw, deps);
    expect(out[0].category).toBe("trzni-kontext");
  });

  it("LLM vyhodí chybu → fallback pro všechny (tichý fail, nespadne)", async () => {
    const deps: ClassifyDeps = { llmJson: vi.fn(async () => { throw new Error("LLM down"); }) };
    const out = await classify(raw, deps);
    expect(out).toHaveLength(2);
    expect(out[0].signals.actionable).toBe(false);
  });

  it("LLM vrátí jiný počet položek → fallback (nepárování)", async () => {
    const deps: ClassifyDeps = { llmJson: vi.fn(async () => ({ items: [{ category: "regulatorni" }] })) };
    const out = await classify(raw, deps);
    expect(out.every((o) => o.category === "trzni-kontext")).toBe(true);
  });

  it("prázdný vstup → prázdný výstup, LLM se nevolá", async () => {
    const llmJson = vi.fn();
    await classify([], { llmJson });
    expect(llmJson).not.toHaveBeenCalled();
  });
});

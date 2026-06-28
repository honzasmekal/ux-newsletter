import { describe, it, expect, vi } from "vitest";
import { fetchSource, type SourceDef, type SourceDeps } from "../../src/adapters/sources";

const rssSource: SourceDef = {
  name: "ČOI", url: "https://coi.cz/rss", group: "A", category: "regulatorni", type: "rss",
};

function deps(over: Partial<SourceDeps>): SourceDeps {
  return {
    httpGet: vi.fn(async () => "<xml/>"),
    parseRss: vi.fn(async () => [
      { title: "Kontrolní zpráva", link: "https://coi.cz/a", summary: "...", publishedAt: "2026-06-25" },
    ]),
    parseHtml: vi.fn(() => []),
    ...over,
  };
}

describe("fetchSource", () => {
  it("RSS → namapuje na FeedItem s group/category zdroje", async () => {
    const r = await fetchSource(rssSource, deps({}));
    expect(r.ok).toBe(true);
    expect(r.count).toBe(1);
    expect(r.items[0]).toMatchObject({ source: "ČOI", group: "A", category: "regulatorni" });
  });

  it("chyba HTTP → ok=false, count=0, nevyhodí", async () => {
    const r = await fetchSource(rssSource, deps({
      httpGet: vi.fn(async () => { throw new Error("timeout"); }),
    }));
    expect(r.ok).toBe(false);
    expect(r.count).toBe(0);
    expect(r.error).toMatch(/timeout/);
  });

  it("prázdný RSS → ok=true ale count=0 (odlišeno od chyby)", async () => {
    const r = await fetchSource(rssSource, deps({ parseRss: vi.fn(async () => []) }));
    expect(r.ok).toBe(true);
    expect(r.count).toBe(0);
  });
});

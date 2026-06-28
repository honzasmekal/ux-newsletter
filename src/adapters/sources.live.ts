import Parser from "rss-parser";
import type { SourceDeps, ParsedEntry } from "./sources";

/** Produkční SourceDeps: globální fetch + rss-parser. HTML zdroje viz pozn. níž. */
export function createSourceDeps(): SourceDeps {
  const parser = new Parser({ timeout: 20_000 });
  return {
    async httpGet(url) {
      const res = await fetch(url, {
        headers: { "user-agent": "UX-Recall/1.0 (+newsletter agent)" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    },
    async parseRss(xml) {
      const feed = await parser.parseString(xml);
      return (feed.items ?? []).map((it): ParsedEntry => ({
        title: it.title ?? "",
        link: it.link ?? "",
        summary: (it.contentSnippet ?? it.content ?? "").slice(0, 500),
        publishedAt: it.isoDate ?? null,
      }));
    },
    // V1: HTML zdroje vracejí prázdno, dokud per-zdroj nedoladíme selektory (spec §9).
    // Allowlist proto preferuje RSS; HTML zdroj zapnem, až bude mít definovanou extrakci.
    parseHtml() {
      return [];
    },
  };
}

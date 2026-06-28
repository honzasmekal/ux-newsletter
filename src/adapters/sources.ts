import type { FeedItem, SourceGroup, Category } from "../domain/types";

export interface SourceDef {
  name: string; url: string; group: SourceGroup; category: Category; type: "rss" | "html";
}

export interface ParsedEntry { title: string; link: string; summary: string; publishedAt: string | null; }

/** Injektovatelné závislosti — v produkci `fetch` + rss-parser, v testech mocky. */
export interface SourceDeps {
  httpGet(url: string): Promise<string>;
  parseRss(xml: string): Promise<ParsedEntry[]>;
  parseHtml(html: string, src: SourceDef): ParsedEntry[];
}

export interface FetchResult { source: string; group: SourceGroup; ok: boolean; count: number; items: FeedItem[]; error?: string; }

/**
 * Načte jeden zdroj. Chyba/timeout/prázdno → ok=false (tichý fail viditelný v reportu §9),
 * NIKDY nevyhodí — selhání jednoho zdroje nesmí shodit celý běh.
 */
export async function fetchSource(src: SourceDef, deps: SourceDeps): Promise<FetchResult> {
  try {
    const raw = await deps.httpGet(src.url);
    const entries = src.type === "rss" ? await deps.parseRss(raw) : deps.parseHtml(raw, src);
    const items: FeedItem[] = entries.map((e) => ({
      title: e.title, url: e.link, source: src.name, group: src.group,
      category: src.category, publishedAt: e.publishedAt, summary: e.summary,
    }));
    return { source: src.name, group: src.group, ok: true, count: items.length, items };
  } catch (err) {
    return {
      source: src.name, group: src.group, ok: false, count: 0, items: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function fetchAll(sources: SourceDef[], deps: SourceDeps): Promise<FetchResult[]> {
  return Promise.all(sources.map((s) => fetchSource(s, deps)));
}

import type { FeedItem, Category } from "../domain/types";
import type { InclusionSignals } from "../domain/inclusion";

export interface ClassifiedItem extends FeedItem { signals: InclusionSignals; }

/** Vstup do klasifikace — surový item bez kategorie/signálů. */
export interface RawForClassify {
  title: string; url: string; source: string;
  group: FeedItem["group"]; publishedAt: string | null; summary: string;
}

/** Injektovatelné LLM volání — v produkci Anthropic SDK (Haiku 4.5), v testech mock. */
export interface ClassifyDeps {
  llmJson(system: string, user: string): Promise<unknown>;
}

const CATEGORIES: Category[] = [
  "regulatorni", "platformni", "checkout-duvera", "ux-vyzkum", "trzni-kontext",
];

const SYSTEM = `Jsi klasifikátor článků pro interní UX/e-commerce newsletter (CZ trh).
Pro každý článek vrať JSON pole "items", každý prvek:
{ "category": jedna z [${CATEGORIES.join(", ")}],
  "actionable": bool (implikuje změnu na webu klienta?),
  "evidence": "empirická studie" | "blog" | "názor",
  "novel": bool (nové vs. recyklát) }
Pořadí zachovej. Vrať POUZE validní JSON.`;

function coerceCategory(v: unknown): Category {
  return CATEGORIES.includes(v as Category) ? (v as Category) : "trzni-kontext";
}

/**
 * Klasifikuje dávku článků přes LLM. Tichý fail (§9): když LLM vrátí nevalidní/prázdný
 * výstup, item dostane bezpečný default (trzni-kontext, neakční) místo pádu.
 */
export async function classify(raw: RawForClassify[], deps: ClassifyDeps): Promise<ClassifiedItem[]> {
  if (raw.length === 0) return [];
  const fallback = (r: RawForClassify): ClassifiedItem => ({
    ...r, category: "trzni-kontext",
    signals: { actionable: false, evidence: "blog", novel: false },
  });

  let parsed: unknown;
  try {
    const user = JSON.stringify(raw.map((r) => ({ title: r.title, summary: r.summary, source: r.source })));
    parsed = await deps.llmJson(SYSTEM, user);
  } catch {
    return raw.map(fallback);
  }

  const arr = (parsed as { items?: unknown[] })?.items;
  if (!Array.isArray(arr) || arr.length !== raw.length) return raw.map(fallback);

  return raw.map((r, i) => {
    const c = arr[i] as Record<string, unknown> | undefined;
    if (!c) return fallback(r);
    return {
      ...r,
      category: coerceCategory(c.category),
      signals: {
        actionable: c.actionable === true,
        evidence: typeof c.evidence === "string" ? c.evidence : "blog",
        novel: c.novel === true,
      },
    };
  });
}

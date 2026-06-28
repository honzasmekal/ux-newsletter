import type {
  RemediationWeight, TrackerItem, FiredLegItem, FeedItem, Candidate,
} from "./types";

export function horizonsFor(w: RemediationWeight): number[] {
  return w === "těžká" ? [90, 30, 7] : [30, 7];
}

export function daysUntil(effectiveDate: string | null, today: string): number | null {
  if (!effectiveDate) return null;
  const ms = Date.parse(effectiveDate) - Date.parse(today);
  return Math.round(ms / 86_400_000);
}

export interface FiringResult { firings: FiredLegItem[]; newFlags: string[]; }

export function tMinusFirings(item: TrackerItem, today: string): FiringResult {
  if (!item.confirmed) return { firings: [], newFlags: [] };
  const d = daysUntil(item.effectiveDate, today);
  if (d === null || d < 0) return { firings: [], newFlags: [] };
  const candidates: FiredLegItem[] = [];
  for (const h of horizonsFor(item.remediationWeight)) {
    const flag = `T-${h}`;
    if (d <= h && !item.firedFlags.includes(flag)) {
      candidates.push({ item, reason: `Termín za ${d} dní (horizont T-${h})`, flag });
    }
  }
  if (candidates.length === 0) return { firings: [], newFlags: [] };
  // Vypal jen nejbližší dosud nevypálený horizont (nejmenší h), ať se neukáže víc upozornění naráz.
  candidates.sort((a, b) => Number(a.flag.slice(2)) - Number(b.flag.slice(2)));
  const keep = candidates[0];
  return { firings: [keep], newFlags: [keep.flag] };
}

function looseMatch(text: string, item: TrackerItem): boolean {
  const hay = text.toLowerCase();
  const needles = [item.id, ...item.title.toLowerCase().split(/\s+/)].filter((w) => w.length > 2);
  return needles.some((n) => hay.includes(n.toLowerCase()));
}

export function proposeCandidates(raw: FeedItem[], tracker: TrackerItem[]): Candidate[] {
  const out: Candidate[] = [];
  for (const r of raw) {
    if (r.category !== "regulatorni") continue;
    if (r.group !== "A") continue; // sourcing constraint: jen Skupina A smí mutovat tracker
    const text = `${r.title} ${r.summary}`;
    const hit = tracker.find((t) => looseMatch(text, t));
    if (hit) {
      out.push({
        type: "update", trackerId: hit.id, sourceUrl: r.url,
        proposed: { lastMaterialChange: { date: r.publishedAt ?? "", note: r.title } },
        diff: `Možná změna u „${hit.title}": ${r.title}`,
      });
    } else {
      out.push({ type: "nová", sourceUrl: r.url, proposed: { title: r.title } });
    }
  }
  return out;
}

export interface LegislationResult {
  firings: FiredLegItem[];
  flagUpdates: { id: string; flags: string[] }[];
}

export function computeLegislation(items: TrackerItem[], today: string): LegislationResult {
  const firings: FiredLegItem[] = [];
  const flagUpdates: { id: string; flags: string[] }[] = [];
  for (const item of items) {
    const r = tMinusFirings(item, today);
    if (r.firings.length) {
      firings.push(...r.firings);
      flagUpdates.push({ id: item.id, flags: [...item.firedFlags, ...r.newFlags] });
    }
  }
  return { firings, flagUpdates };
}

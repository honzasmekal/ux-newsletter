export type Status = "navrženo" | "schváleno" | "účinné" | "vymáháno";
export type RemediationWeight = "lehká" | "těžká";
export type SourceGroup = "A" | "B";
export type Category =
  | "regulatorni" | "platformni" | "checkout-duvera" | "ux-vyzkum" | "trzni-kontext";

export interface TrackerItem {
  id: string;
  title: string;
  effectiveDate: string | null;     // ISO yyyy-mm-dd
  status: Status;
  lastMaterialChange: { date: string; note: string } | null;
  remediationWeight: RemediationWeight;
  firedFlags: string[];             // klíče typu "T-90", "T-7", "material:2026-06-01"
  confirmed: boolean;
  segment?: string[];
  sourceUrl?: string;
}

export type CandidateType = "nová" | "update";
export interface Candidate {
  type: CandidateType;
  proposed: Partial<TrackerItem>;
  diff?: string;
  trackerId?: string;               // u update
  sourceUrl?: string;
}

export interface FeedItem {
  title: string;
  url: string;
  source: string;
  group: SourceGroup;
  category: Category;
  publishedAt: string | null;
  summary: string;
}

export interface FiredLegItem { item: TrackerItem; reason: string; flag: string; }

export interface Digest {
  weekOf: string;
  legislation: FiredLegItem[];
  feed: FeedItem[];
  empty: boolean;
}

export interface RunReport {
  weekOf: string;
  perSource: { source: string; group: SourceGroup; ok: boolean; count: number }[];
  candidates: number;
  pendingCandidates: number;
  errors: string[];
}

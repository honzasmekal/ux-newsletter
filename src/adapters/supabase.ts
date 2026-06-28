import type {
  TrackerItem, Candidate, Status, RemediationWeight, SourceGroup, Category,
} from "../domain/types";
import type { SourceDef } from "./sources";

export type Row = Record<string, unknown>;

/**
 * Nízkoúrovňové rozhraní nad Supabase — v produkci napojeno na @supabase/supabase-js,
 * v testech mockováno. Drží mapování pole↔typ testovatelné bez reálné DB.
 */
export interface SupabaseBackend {
  selectAll(table: string): Promise<Row[]>;
  insert(table: string, row: Row): Promise<Row>;
  update(table: string, idColumn: string, idValue: string, patch: Row): Promise<void>;
}

function asStr(v: unknown): string { return typeof v === "string" ? v : ""; }
function asBool(v: unknown): boolean { return v === true; }
function asArr(v: unknown): string[] { return Array.isArray(v) ? (v as string[]) : []; }

function toTracker(r: Row): TrackerItem {
  const lmcDate = asStr(r.last_material_change_date);
  return {
    id: asStr(r.id),
    title: asStr(r.title),
    effectiveDate: asStr(r.effective_date) || null,
    status: (asStr(r.status) || "navrženo") as Status,
    lastMaterialChange: lmcDate
      ? { date: lmcDate, note: asStr(r.last_material_change_note) }
      : null,
    remediationWeight: (asStr(r.remediation_weight) || "lehká") as RemediationWeight,
    firedFlags: asArr(r.fired_flags),
    confirmed: asBool(r.confirmed),
    segment: asArr(r.segment).length ? asArr(r.segment) : undefined,
    sourceUrl: asStr(r.source_url) || undefined,
  };
}

function toSource(r: Row): SourceDef {
  return {
    name: asStr(r.name), url: asStr(r.url),
    group: (asStr(r.group) || "B") as SourceGroup,
    category: (asStr(r.category) || "trzni-kontext") as Category,
    type: (asStr(r.type) || "rss") as "rss" | "html",
  };
}

export class SupabaseStore {
  constructor(private readonly be: SupabaseBackend) {}

  async getAllTracker(): Promise<TrackerItem[]> {
    return (await this.be.selectAll("tracker")).map(toTracker);
  }
  async getConfirmedTracker(): Promise<TrackerItem[]> {
    return (await this.getAllTracker()).filter((t) => t.confirmed);
  }
  async getActiveSources(): Promise<SourceDef[]> {
    return (await this.be.selectAll("sources")).filter((r) => r.active === true).map(toSource);
  }
  async getRecipients(): Promise<{ email: string; name: string }[]> {
    return (await this.be.selectAll("recipients"))
      .filter((r) => r.active === true)
      .map((r) => ({ email: asStr(r.email), name: asStr(r.name) }));
  }
  async queueCandidate(c: Candidate): Promise<void> {
    await this.be.insert("candidates", {
      type: c.type, proposed: c.proposed, diff: c.diff ?? null,
      tracker_id: c.trackerId ?? null, source_url: c.sourceUrl ?? null, status: "pending",
    });
  }
  async countPendingCandidates(): Promise<number> {
    return (await this.be.selectAll("candidates")).filter((r) => r.status === "pending").length;
  }
  /** Tracker primary key JE doménové id → update přímo, bez dohledávání. */
  async updateFiredFlags(domainId: string, flags: string[]): Promise<void> {
    await this.be.update("tracker", "id", domainId, { fired_flags: flags });
  }
  async saveDigestDraft(weekOf: string, html: string, text: string, summary: string, empty: boolean): Promise<string> {
    const row = await this.be.insert("digests", {
      week_of: weekOf, status: "draft", html, body_text: text, items_summary: summary, empty,
    });
    return asStr(row.id);
  }
  async getLatestDraft(): Promise<{ id: string; html: string; text: string; weekOf: string; empty: boolean } | null> {
    const drafts = (await this.be.selectAll("digests"))
      .filter((r) => r.status === "draft")
      .sort((a, b) => asStr(b.created_at).localeCompare(asStr(a.created_at)));
    if (drafts.length === 0) return null;
    const d = drafts[0];
    return {
      id: asStr(d.id), html: asStr(d.html), text: asStr(d.body_text),
      weekOf: asStr(d.week_of), empty: d.empty === true,
    };
  }
  async markDigestSent(id: string, sentAt: string): Promise<void> {
    await this.be.update("digests", "id", id, { status: "sent", sent_at: sentAt });
  }
}

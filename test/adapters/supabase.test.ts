import { describe, it, expect, vi } from "vitest";
import { SupabaseStore, type SupabaseBackend, type Row } from "../../src/adapters/supabase";

function backend(data: Record<string, Row[]>): SupabaseBackend {
  return {
    selectAll: vi.fn(async (t: string) => data[t] ?? []),
    insert: vi.fn(async (_t: string, row: Row) => ({ id: "new-id", ...row })),
    update: vi.fn(async () => {}),
  };
}

describe("SupabaseStore", () => {
  it("getConfirmedTracker mapuje a filtruje (fired_flags jako jsonb pole)", async () => {
    const be = backend({
      tracker: [
        { id: "eaa", title: "EAA", effective_date: "2026-09-26", status: "schváleno",
          remediation_weight: "těžká", confirmed: true, fired_flags: ["T-90"], segment: [] },
        { id: "x", title: "X", confirmed: false, fired_flags: [] },
      ],
    });
    const items = await new SupabaseStore(be).getConfirmedTracker();
    expect(items).toHaveLength(1);
    expect(items[0].firedFlags).toEqual(["T-90"]);
    expect(items[0].remediationWeight).toBe("těžká");
  });

  it("getActiveSources filtruje aktivní a mapuje group", async () => {
    const be = backend({
      sources: [
        { name: "ČOI", url: "u", group: "A", category: "regulatorni", type: "rss", active: true },
        { name: "Stará", url: "x", group: "B", active: false },
      ],
    });
    const s = await new SupabaseStore(be).getActiveSources();
    expect(s).toHaveLength(1);
    expect(s[0].group).toBe("A");
  });

  it("queueCandidate vloží pending kandidáta", async () => {
    const be = backend({});
    await new SupabaseStore(be).queueCandidate({
      type: "update", trackerId: "eaa", diff: "d", proposed: { title: "EAA" },
    });
    expect(be.insert).toHaveBeenCalledWith("candidates",
      expect.objectContaining({ type: "update", tracker_id: "eaa", status: "pending" }));
  });

  it("updateFiredFlags updatuje přímo podle id (tracker PK = doménové id)", async () => {
    const be = backend({});
    await new SupabaseStore(be).updateFiredFlags("eaa", ["T-90", "T-30"]);
    expect(be.update).toHaveBeenCalledWith("tracker", "id", "eaa", { fired_flags: ["T-90", "T-30"] });
  });

  it("countPendingCandidates počítá jen pending", async () => {
    const be = backend({ candidates: [
      { status: "pending" }, { status: "approved" }, { status: "pending" },
    ] });
    expect(await new SupabaseStore(be).countPendingCandidates()).toBe(2);
  });

  it("getLatestDraft vrátí nejnovější draft + mapuje body_text→text, empty", async () => {
    const be = backend({ digests: [
      { id: "d1", status: "draft", html: "<p>old</p>", body_text: "old", week_of: "2026-06-21",
        empty: false, created_at: "2026-06-21T18:00:00Z" },
      { id: "d2", status: "draft", html: "<p>new</p>", body_text: "new", week_of: "2026-06-28",
        empty: false, created_at: "2026-06-28T18:00:00Z" },
      { id: "d0", status: "sent", html: "x", body_text: "x", week_of: "2026-06-14",
        empty: false, created_at: "2026-06-14T18:00:00Z" },
    ] });
    const draft = await new SupabaseStore(be).getLatestDraft();
    expect(draft?.id).toBe("d2");
    expect(draft?.text).toBe("new");
    expect(draft?.weekOf).toBe("2026-06-28");
  });

  it("markDigestSent nastaví status sent + sent_at", async () => {
    const be = backend({});
    await new SupabaseStore(be).markDigestSent("d2", "2026-06-29T05:00:00Z");
    expect(be.update).toHaveBeenCalledWith("digests", "id", "d2",
      expect.objectContaining({ status: "sent" }));
  });
});

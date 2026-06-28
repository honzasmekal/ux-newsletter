import { describe, it, expect, vi } from "vitest";
import { runBuild, type BuildDeps } from "../../src/pipeline/build";
import type { TrackerItem } from "../../src/domain/types";
import type { FetchResult, SourceDef } from "../../src/adapters/sources";
import type { ClassifiedItem, RawForClassify } from "../../src/adapters/classify";

const eaa: TrackerItem = {
  id: "eaa", title: "EAA", effectiveDate: "2026-09-26", status: "schváleno",
  lastMaterialChange: null, remediationWeight: "těžká", firedFlags: [], confirmed: true,
};

function deps(over: Partial<BuildDeps> = {}): BuildDeps {
  return {
    getAllTracker: vi.fn(async () => [eaa]),
    getActiveSources: vi.fn(async (): Promise<SourceDef[]> => [
      { name: "ČOI", url: "u", group: "A", category: "regulatorni", type: "rss" },
    ]),
    fetchAll: vi.fn(async (): Promise<FetchResult[]> => [
      { source: "ČOI", group: "A", ok: true, count: 1, items: [
        { title: "ČOI vymáhá EAA", url: "x", source: "ČOI", group: "A",
          category: "regulatorni", publishedAt: "2026-06-25", summary: "EAA..." },
      ] },
    ]),
    classify: vi.fn(async (raw: RawForClassify[]): Promise<ClassifiedItem[]> => raw.map((r) => ({
      ...r, category: "regulatorni",
      signals: { actionable: true, evidence: "blog", novel: true },
    }))),
    queueCandidate: vi.fn(async () => {}),
    countPendingCandidates: vi.fn(async () => 3),
    updateFiredFlags: vi.fn(async () => {}),
    saveDigestDraft: vi.fn(async () => "d1"),
    sendHeartbeat: vi.fn(async () => {}),
    ...over,
  };
}

describe("runBuild", () => {
  it("šťastná cesta: uloží draft, pošle heartbeat, vrátí report", async () => {
    const d = deps();
    const report = await runBuild(d, "2026-06-28", "2026-06-28");
    expect(d.saveDigestDraft).toHaveBeenCalled();
    expect(d.sendHeartbeat).toHaveBeenCalled();
    expect(report.pendingCandidates).toBe(3);
    expect(report.perSource[0]).toMatchObject({ source: "ČOI", ok: true });
  });

  it("T-minus: EAA 90 dní → zapíše fired_flags T-90", async () => {
    const updateFiredFlags = vi.fn(async () => {});
    await runBuild(deps({ updateFiredFlags }), "2026-06-28", "2026-06-28");
    expect(updateFiredFlags).toHaveBeenCalledWith("eaa", ["T-90"]);
  });

  it("kandidát ze Skupiny A (zmínka EAA) se zařadí do fronty", async () => {
    const queueCandidate = vi.fn(async () => {});
    await runBuild(deps({ queueCandidate }), "2026-06-28", "2026-06-28");
    expect(queueCandidate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "update", trackerId: "eaa" }));
  });

  it("failnutý zdroj Skupiny A → v reportu ok:false + chyba", async () => {
    const fetchAll = vi.fn(async (): Promise<FetchResult[]> => [
      { source: "ČOI", group: "A", ok: false, count: 0, items: [], error: "timeout" },
    ]);
    const report = await runBuild(deps({ fetchAll }), "2026-06-28", "2026-06-28");
    expect(report.perSource[0]).toMatchObject({ ok: false, group: "A" });
    expect(report.errors.some((e) => e.includes("timeout"))).toBe(true);
  });

  it("prázdný týden: žádné zdroje → draft empty, heartbeat stejně odejde", async () => {
    const saveDigestDraft = vi.fn(async () => "d0");
    const d = deps({
      getActiveSources: vi.fn(async () => []),
      fetchAll: vi.fn(async () => []),
      classify: vi.fn(async () => []),
      getAllTracker: vi.fn(async () => []),
      saveDigestDraft,
    });
    const report = await runBuild(d, "2025-01-01", "2025-01-01");
    expect(saveDigestDraft).toHaveBeenCalledWith(
      "2025-01-01", expect.any(String), expect.any(String), expect.any(String), true);
    expect(d.sendHeartbeat).toHaveBeenCalled();
    expect(report.candidates).toBe(0);
  });
});

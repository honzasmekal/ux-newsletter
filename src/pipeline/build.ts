import type { TrackerItem, Candidate, RunReport, FeedItem } from "../domain/types";
import type { SourceDef, FetchResult } from "../adapters/sources";
import type { RawForClassify, ClassifiedItem } from "../adapters/classify";
import { computeLegislation, proposeCandidates } from "../domain/legislation";
import { passesInclusion } from "../domain/inclusion";
import { assembleDigest } from "../domain/digest";
import { renderDigest } from "../domain/render";

/** Vše, co `build` potřebuje — injektované, aby šel celý pipeline testovat s mocky. */
export interface BuildDeps {
  getAllTracker(): Promise<TrackerItem[]>;
  getActiveSources(): Promise<SourceDef[]>;
  fetchAll(sources: SourceDef[]): Promise<FetchResult[]>;
  classify(raw: RawForClassify[]): Promise<ClassifiedItem[]>;
  queueCandidate(c: Candidate): Promise<void>;
  countPendingCandidates(): Promise<number>;
  updateFiredFlags(domainId: string, flags: string[]): Promise<void>;
  saveDigestDraft(weekOf: string, html: string, text: string, summary: string, empty: boolean): Promise<string>;
  sendHeartbeat(report: RunReport): Promise<void>;
}

/**
 * Nedělní běh (§6): sběr → klasifikace → event-logika → digest draft → heartbeat.
 * `today`/`weekOf` se předávají (čistota, testovatelnost). Vrací RunReport.
 */
export async function runBuild(deps: BuildDeps, today: string, weekOf: string): Promise<RunReport> {
  const errors: string[] = [];

  const sources = await deps.getActiveSources();
  const results = await deps.fetchAll(sources);
  const perSource = results.map((r) => ({ source: r.source, group: r.group, ok: r.ok, count: r.count }));
  for (const r of results) if (!r.ok && r.error) errors.push(`Zdroj ${r.source}: ${r.error}`);

  const rawItems: RawForClassify[] = results.flatMap((r) => r.items);

  let classified: ClassifiedItem[] = [];
  try {
    classified = await deps.classify(rawItems);
  } catch (err) {
    errors.push(`Klasifikace selhala: ${err instanceof Error ? err.message : String(err)}`);
  }

  const tracker = await deps.getAllTracker();

  // Event-logika legislativy (autonomní T-minus + flagy)
  const leg = computeLegislation(tracker, today);
  for (const u of leg.flagUpdates) {
    try { await deps.updateFiredFlags(u.id, u.flags); }
    catch (err) { errors.push(`Zápis fired_flags ${u.id}: ${err instanceof Error ? err.message : String(err)}`); }
  }

  // Kandidáti na mutaci trackeru (jen Skupina A; frontují se, nemutují)
  const feedForCandidates: FeedItem[] = classified;
  const candidates = proposeCandidates(feedForCandidates, tracker);
  for (const c of candidates) {
    try { await deps.queueCandidate(c); }
    catch (err) { errors.push(`Fronta kandidáta: ${err instanceof Error ? err.message : String(err)}`); }
  }

  // Feed do digestu = klasifikované itemy, co projdou inkluzní rubrikou (recall)
  const feed: FeedItem[] = classified.filter((c) => passesInclusion(c.signals));

  const digest = assembleDigest(weekOf, leg.firings, feed);
  const rendered = renderDigest(digest);
  const summary = `${digest.legislation.length} legislativa + ${digest.feed.length} feed`;
  await deps.saveDigestDraft(weekOf, rendered.html, rendered.text, summary, digest.empty);

  const pendingCandidates = await deps.countPendingCandidates();
  const report: RunReport = {
    weekOf, perSource, candidates: candidates.length, pendingCandidates, errors,
  };
  await deps.sendHeartbeat(report);
  return report;
}

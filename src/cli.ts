import { loadConfig } from "./adapters/config";
import { SupabaseStore } from "./adapters/supabase";
import { createSupabaseBackend } from "./adapters/supabase.live";
import { fetchAll } from "./adapters/sources";
import { createSourceDeps } from "./adapters/sources.live";
import { classify } from "./adapters/classify";
import { createClassifyDeps } from "./adapters/classify.live";
import { Mailer } from "./adapters/email";
import { createEmailDeps } from "./adapters/email.live";
import { runBuild } from "./pipeline/build";
import { runSend } from "./pipeline/send";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  if (cmd !== "build" && cmd !== "send") {
    console.error("Použití: cli.ts build|send");
    process.exit(1);
  }

  const cfg = loadConfig(process.env);
  const store = new SupabaseStore(
    createSupabaseBackend(cfg.SUPABASE_URL, cfg.SUPABASE_SERVICE_ROLE_KEY),
  );
  const mailer = new Mailer(createEmailDeps(cfg.RESEND_API_KEY), cfg.NEWSLETTER_FROM);
  const now = new Date();

  if (cmd === "build") {
    const sourceDeps = createSourceDeps();
    const classifyDeps = createClassifyDeps(cfg.ANTHROPIC_API_KEY);
    const today = isoDate(now);
    const report = await runBuild(
      {
        getAllTracker: () => store.getAllTracker(),
        getActiveSources: () => store.getActiveSources(),
        fetchAll: (sources) => fetchAll(sources, sourceDeps),
        classify: (raw) => classify(raw, classifyDeps),
        queueCandidate: (c) => store.queueCandidate(c),
        countPendingCandidates: () => store.countPendingCandidates(),
        updateFiredFlags: (id, flags) => store.updateFiredFlags(id, flags),
        saveDigestDraft: (w, h, t, s, e) => store.saveDigestDraft(w, h, t, s, e),
        sendHeartbeat: (r) => mailer.sendHeartbeat(cfg.OWNER_EMAIL, r).then(() => {}),
      },
      today,
      today,
    );
    console.log(
      `build hotovo (${today}): ${report.perSource.length} zdrojů, ` +
        `${report.candidates} kandidátů, ${report.pendingCandidates} nevyřízených, ${report.errors.length} chyb`,
    );
  } else {
    const res = await runSend(
      {
        getLatestDraft: () => store.getLatestDraft(),
        getRecipients: () => store.getRecipients(),
        sendNewsletter: (rec, w, h, t) => mailer.sendNewsletter(rec, w, h, t),
        markDigestSent: (id, at) => store.markDigestSent(id, at),
        notifyOwner: (subject, text) => mailer.notify(cfg.OWNER_EMAIL, subject, text).then(() => {}),
      },
      now.toISOString(),
    );
    console.log(
      `send hotovo: ${res.skipped ? "nic k odeslání" : res.empty ? "prázdný týden (tým nic)" : `rozesláno na ${res.sent} adres`}`,
    );
  }
}

main().catch((err) => {
  console.error("Agent selhal:", err);
  process.exit(1);
});

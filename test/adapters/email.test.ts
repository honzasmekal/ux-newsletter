import { describe, it, expect, vi } from "vitest";
import { Mailer, renderHeartbeatText, type EmailDeps } from "../../src/adapters/email";
import type { RunReport } from "../../src/domain/types";

const baseReport: RunReport = {
  weekOf: "2026-06-28",
  perSource: [
    { source: "ČOI", group: "A", ok: true, count: 3 },
    { source: "Lupa", group: "B", ok: true, count: 5 },
  ],
  candidates: 1, pendingCandidates: 2, errors: [],
};

describe("Mailer", () => {
  it("sendNewsletter zavolá send s příjemci a předmětem", async () => {
    const deps: EmailDeps = { send: vi.fn(async () => ({ ok: true })) };
    await new Mailer(deps, "from@x.cz").sendNewsletter(["a@x.cz"], "2026-06-28", "<p>x</p>", "x");
    expect(deps.send).toHaveBeenCalledWith("from@x.cz", expect.objectContaining({
      to: ["a@x.cz"], subject: expect.stringContaining("2026-06-28"),
    }));
  });

  it("sendNewsletter bez příjemců → ok, neodesílá", async () => {
    const send = vi.fn();
    const r = await new Mailer({ send }, "from@x.cz").sendNewsletter([], "2026-06-28", "", "");
    expect(r.ok).toBe(true);
    expect(send).not.toHaveBeenCalled();
  });

  it("selhání SMTP se propíše do výsledku, nespolkne se", async () => {
    const deps: EmailDeps = { send: vi.fn(async () => ({ ok: false, error: "SMTP down" })) };
    const r = await new Mailer(deps, "from@x.cz").sendNewsletter(["a@x.cz"], "2026-06-28", "x", "x");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("SMTP down");
  });
});

describe("renderHeartbeatText", () => {
  it("obsahuje county a počet nevyřízených kandidátů", () => {
    const t = renderHeartbeatText(baseReport);
    expect(t).toMatch(/Zdrojů zpracováno: 2/);
    expect(t).toMatch(/Nevyřízených kandidátů ve frontě: 2/);
  });

  it("primární zdroj (A) s chybou → varování o podezřelém prázdnu", () => {
    const t = renderHeartbeatText({
      ...baseReport,
      perSource: [{ source: "ČOI", group: "A", ok: false, count: 0 }],
    });
    expect(t).toMatch(/⚠️ Podezřelé/);
    expect(t).toMatch(/ČOI/);
  });
});

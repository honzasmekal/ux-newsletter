import { describe, it, expect, vi } from "vitest";
import { runSend, type SendDeps } from "../../src/pipeline/send";

function deps(over: Partial<SendDeps> = {}): SendDeps {
  return {
    getLatestDraft: vi.fn(async () => ({
      id: "d1", html: "<p>x</p>", text: "x", weekOf: "2026-06-28", empty: false,
    })),
    getRecipients: vi.fn(async () => [{ email: "a@x.cz", name: "A" }, { email: "b@x.cz", name: "B" }]),
    sendNewsletter: vi.fn(async () => ({ ok: true })),
    markDigestSent: vi.fn(async () => {}),
    notifyOwner: vi.fn(async () => {}),
    ...over,
  };
}

describe("runSend", () => {
  it("neprázdný draft → rozešle týmu, označí sent, potvrdí majiteli", async () => {
    const d = deps();
    const r = await runSend(d, "2026-06-29T05:00:00Z");
    expect(r).toEqual({ sent: 2, empty: false, skipped: false });
    expect(d.sendNewsletter).toHaveBeenCalledWith(
      ["a@x.cz", "b@x.cz"], "2026-06-28", "<p>x</p>", "x");
    expect(d.markDigestSent).toHaveBeenCalledWith("d1", "2026-06-29T05:00:00Z");
    expect(d.notifyOwner).toHaveBeenCalled();
  });

  it("prázdný týden → tým nedostane nic, majitel potvrzení", async () => {
    const d = deps({
      getLatestDraft: vi.fn(async () => ({ id: "d0", html: "", text: "", weekOf: "2025-01-01", empty: true })),
    });
    const r = await runSend(d, "2025-01-06T05:00:00Z");
    expect(r.empty).toBe(true);
    expect(r.sent).toBe(0);
    expect(d.sendNewsletter).not.toHaveBeenCalled();
    expect(d.notifyOwner).toHaveBeenCalled();
  });

  it("žádný draft → neodesílá, upozorní majitele (možná build neproběhl)", async () => {
    const d = deps({ getLatestDraft: vi.fn(async () => null) });
    const r = await runSend(d, "2026-06-29T05:00:00Z");
    expect(r.skipped).toBe(true);
    expect(d.notifyOwner).toHaveBeenCalled();
  });

  it("selhání rozeslání → neoznačí sent, upozorní majitele", async () => {
    const d = deps({ sendNewsletter: vi.fn(async () => ({ ok: false, error: "Resend 500" })) });
    const r = await runSend(d, "2026-06-29T05:00:00Z");
    expect(r.sent).toBe(0);
    expect(d.markDigestSent).not.toHaveBeenCalled();
    expect(d.notifyOwner).toHaveBeenCalledWith(
      expect.stringContaining("selhalo"), expect.stringContaining("Resend 500"));
  });
});

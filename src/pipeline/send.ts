import type { SendOutcome } from "../adapters/email";

/** Vše, co `send` potřebuje — injektované pro testovatelnost. */
export interface SendDeps {
  getLatestDraft(): Promise<{ id: string; html: string; text: string; weekOf: string; empty: boolean } | null>;
  getRecipients(): Promise<{ email: string; name: string }[]>;
  sendNewsletter(recipients: string[], weekOf: string, html: string, text: string): Promise<SendOutcome>;
  markDigestSent(id: string, sentAt: string): Promise<void>;
  notifyOwner(subject: string, text: string): Promise<void>;
}

export interface SendResult { sent: number; empty: boolean; skipped: boolean; }

/**
 * Pondělní běh (§6): vezme draft a rozešle týmu. Prázdný týden → tým nic nedostane,
 * majitel vždy potvrzení (prázdno ≠ výpadek). `sentAt` se předává (čistota).
 */
export async function runSend(deps: SendDeps, sentAt: string): Promise<SendResult> {
  const draft = await deps.getLatestDraft();

  if (!draft) {
    await deps.notifyOwner("UX Recall — nic k odeslání", "Nenašel se žádný draft. Možná nedělní build neproběhl?");
    return { sent: 0, empty: false, skipped: true };
  }

  if (draft.empty) {
    await deps.markDigestSent(draft.id, sentAt);
    await deps.notifyOwner(`UX Recall — prázdný týden ${draft.weekOf}`, "Klidný týden — týmu se nic neodesílá.");
    return { sent: 0, empty: true, skipped: false };
  }

  const recipients = (await deps.getRecipients()).map((r) => r.email);
  const outcome = await deps.sendNewsletter(recipients, draft.weekOf, draft.html, draft.text);

  if (!outcome.ok) {
    await deps.notifyOwner(`UX Recall — ⚠️ rozeslání selhalo ${draft.weekOf}`, `Chyba: ${outcome.error ?? "neznámá"}`);
    return { sent: 0, empty: false, skipped: false };
  }

  await deps.markDigestSent(draft.id, sentAt);
  await deps.notifyOwner(`UX Recall — rozesláno ${draft.weekOf}`, `Newsletter odešel na ${recipients.length} adres.`);
  return { sent: recipients.length, empty: false, skipped: false };
}

import type { RunReport } from "../domain/types";

export interface EmailMessage { to: string[]; subject: string; html: string; text: string; }
export interface SendOutcome { ok: boolean; error?: string; }

/** Injektovatelné odeslání — v produkci Resend, v testech mock. */
export interface EmailDeps {
  send(from: string, msg: EmailMessage): Promise<SendOutcome>;
}

export class Mailer {
  constructor(private readonly deps: EmailDeps, private readonly from: string) {}

  async sendNewsletter(recipients: string[], weekOf: string, html: string, text: string): Promise<SendOutcome> {
    if (recipients.length === 0) return { ok: true }; // není komu — není to chyba
    return this.deps.send(this.from, {
      to: recipients, subject: `UX Recall — týden ${weekOf}`, html, text,
    });
  }

  /** Obecné upozornění majiteli (potvrzení rozeslání, prázdný týden, chyba). */
  async notify(owner: string, subject: string, text: string): Promise<SendOutcome> {
    return this.deps.send(this.from, {
      to: [owner], subject,
      html: `<pre style="font-family:ui-monospace,monospace">${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>`,
      text,
    });
  }

  /** Heartbeat majiteli — pozitivní potvrzení i při prázdnu (§9). */
  async sendHeartbeat(owner: string, report: RunReport): Promise<SendOutcome> {
    return this.deps.send(this.from, {
      to: [owner], subject: `UX Recall heartbeat — ${report.weekOf}`,
      html: renderHeartbeatHtml(report), text: renderHeartbeatText(report),
    });
  }
}

export function renderHeartbeatText(r: RunReport): string {
  const failed = r.perSource.filter((s) => !s.ok);
  const suspectA = failed.filter((s) => s.group === "A");
  const lines = [
    `UX Recall — heartbeat ${r.weekOf}`,
    `Zdrojů zpracováno: ${r.perSource.length} (chyb: ${failed.length})`,
    `Kandidátů nově zařazeno: ${r.candidates}`,
    `Nevyřízených kandidátů ve frontě: ${r.pendingCandidates}`,
    `Chyby běhu: ${r.errors.length}`,
  ];
  if (suspectA.length) {
    lines.push(`⚠️ Podezřelé: ${suspectA.length} primárních zdrojů (Skupina A) vrátilo prázdno/chybu — možná změnily strukturu: ${suspectA.map((s) => s.source).join(", ")}`);
  }
  if (r.errors.length) lines.push(`Detaily chyb:`, ...r.errors.map((e) => `- ${e}`));
  return lines.join("\n");
}

export function renderHeartbeatHtml(r: RunReport): string {
  return `<pre style="font-family:ui-monospace,monospace">${renderHeartbeatText(r)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>`;
}

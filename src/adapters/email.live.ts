import { Resend } from "resend";
import type { EmailDeps, EmailMessage, SendOutcome } from "./email";

/** Produkční EmailDeps nad Resend. Chyba se vrací jako ok:false (nikdy nevyhodí). */
export function createEmailDeps(apiKey: string): EmailDeps {
  const resend = new Resend(apiKey);
  return {
    async send(from: string, msg: EmailMessage): Promise<SendOutcome> {
      try {
        const { error } = await resend.emails.send({
          from, to: msg.to, subject: msg.subject, html: msg.html, text: msg.text,
        });
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}

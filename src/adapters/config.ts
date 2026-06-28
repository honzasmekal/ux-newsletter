import { z } from "zod";

const schema = z.object({
  SUPABASE_URL: z.string().url("SUPABASE_URL musí být URL"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "Chybí SUPABASE_SERVICE_ROLE_KEY"),
  ANTHROPIC_API_KEY: z.string().min(1, "Chybí ANTHROPIC_API_KEY"),
  RESEND_API_KEY: z.string().min(1, "Chybí RESEND_API_KEY"),
  NEWSLETTER_FROM: z.string().min(1, "Chybí NEWSLETTER_FROM"),
  OWNER_EMAIL: z.string().email("OWNER_EMAIL musí být e-mail"),
});

export type Config = z.infer<typeof schema>;

/** Načte a zvaliduje konfiguraci z env-like objektu. Bere argument kvůli testovatelnosti. */
export function loadConfig(env: Record<string, string | undefined>): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const msgs = parsed.error.issues
      .map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message))
      .join("; ");
    throw new Error(`Neplatná konfigurace: ${msgs}`);
  }
  return parsed.data;
}

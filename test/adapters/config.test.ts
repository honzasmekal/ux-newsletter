import { describe, it, expect } from "vitest";
import { loadConfig } from "../../src/adapters/config";

const valid = {
  SUPABASE_URL: "https://abc.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "svc", ANTHROPIC_API_KEY: "key",
  RESEND_API_KEY: "re", NEWSLETTER_FROM: "UX Recall <recall@x.cz>", OWNER_EMAIL: "owner@x.cz",
};

describe("loadConfig", () => {
  it("validní env → objekt", () => {
    expect(loadConfig(valid).OWNER_EMAIL).toBe("owner@x.cz");
  });
  it("chybějící SUPABASE_SERVICE_ROLE_KEY → čitelná chyba", () => {
    const { SUPABASE_SERVICE_ROLE_KEY, ...rest } = valid;
    expect(() => loadConfig(rest)).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });
  it("nevalidní OWNER_EMAIL → chyba", () => {
    expect(() => loadConfig({ ...valid, OWNER_EMAIL: "neni-email" })).toThrow(/e-mail/);
  });
});

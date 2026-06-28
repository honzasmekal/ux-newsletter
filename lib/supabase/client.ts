import { createBrowserClient } from "@supabase/ssr";

/** Supabase klient pro klientské komponenty (browser). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

import { createClient } from "@supabase/supabase-js";
import type { SupabaseBackend, Row } from "./supabase";

/** Produkční SupabaseBackend nad @supabase/supabase-js (service-role → obchází RLS). */
export function createSupabaseBackend(url: string, serviceKey: string): SupabaseBackend {
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
  return {
    async selectAll(table) {
      const { data, error } = await sb.from(table).select("*");
      if (error) throw new Error(`Supabase select ${table}: ${error.message}`);
      return (data ?? []) as Row[];
    },
    async insert(table, row) {
      const { data, error } = await sb.from(table).insert(row).select().single();
      if (error) throw new Error(`Supabase insert ${table}: ${error.message}`);
      return data as Row;
    },
    async update(table, idColumn, idValue, patch) {
      const { error } = await sb.from(table).update(patch).eq(idColumn, idValue);
      if (error) throw new Error(`Supabase update ${table}: ${error.message}`);
    },
  };
}

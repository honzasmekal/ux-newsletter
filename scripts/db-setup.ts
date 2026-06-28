// Jednorázový setup DB přes Supabase Management API (DDL — service-role klíč na to nestačí).
// Spuštění: node --env-file=.env --import tsx scripts/db-setup.ts
import { readFileSync } from "node:fs";

const url = process.env.SUPABASE_URL ?? "";
const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = url.match(/https:\/\/([^.]+)\./)?.[1];
if (!token) throw new Error("Chybí SUPABASE_ACCESS_TOKEN");
if (!ref) throw new Error("Nešlo odvodit project ref ze SUPABASE_URL");

async function run(label: string, sql: string): Promise<void> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`${label} FAIL ${res.status}: ${text.slice(0, 800)}`);
    process.exit(1);
  }
  console.log(`${label} OK`);
}

await run("migrace 0001_init", readFileSync("supabase/migrations/0001_init.sql", "utf8"));
await run("seed", readFileSync("supabase/seed.sql", "utf8"));
await run(
  "ověření",
  "select 'tracker' as t, count(*) from tracker union all select 'sources', count(*) from sources;",
);

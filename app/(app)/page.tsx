import { createClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = await createClient();

  async function countRows(table: string, eq?: [string, unknown]): Promise<number> {
    let q = supabase.from(table).select("*", { count: "exact", head: true });
    if (eq) q = q.eq(eq[0], eq[1]);
    const { count } = await q;
    return count ?? 0;
  }

  const [tracker, confirmed, pending, sources, activeSources, recipients] = await Promise.all([
    countRows("tracker"),
    countRows("tracker", ["confirmed", true]),
    countRows("candidates", ["status", "pending"]),
    countRows("sources"),
    countRows("sources", ["active", true]),
    countRows("recipients", ["active", true]),
  ]);

  const { data: latest } = await supabase
    .from("digests")
    .select("week_of, status, empty")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const stats = [
    { title: "Legislativa", value: `${confirmed}/${tracker}`, desc: "potvrzených / celkem" },
    { title: "Nevyřízení kandidáti", value: String(pending), desc: "čekají na schválení" },
    { title: "Aktivní zdroje", value: `${activeSources}/${sources}`, desc: "aktivních / celkem" },
    { title: "Příjemci", value: String(recipients), desc: "aktivních" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Přehled</h1>
        <p className="text-sm text-muted-foreground">Stav newsletteru a fronty.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.title}>
            <CardHeader>
              <CardDescription>{s.title}</CardDescription>
              <CardTitle className="text-3xl">{s.value}</CardTitle>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardDescription>Poslední digest</CardDescription>
          <CardTitle className="text-lg">
            {latest
              ? `${latest.week_of} — ${latest.status}${latest.empty ? " (prázdný týden)" : ""}`
              : "Zatím žádný"}
          </CardTitle>
        </CardHeader>
      </Card>
      {pending > 0 && (
        <p className="text-sm">
          Máš <strong>{pending}</strong> nevyřízených kandidátů ve frontě — mrkni na záložku Kandidáti.
        </p>
      )}
    </div>
  );
}

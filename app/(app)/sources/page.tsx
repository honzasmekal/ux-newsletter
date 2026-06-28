import { createClient } from "@/lib/supabase/server";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SourceRow, type SourceRowData } from "./source-row";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sources")
    .select("id, name, url, group, category, type, active")
    .order("group")
    .order("name");

  const rows = (data ?? []) as SourceRowData[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Zdroje</h1>
        <p className="text-sm text-muted-foreground">
          Skupina <strong>A</strong> smí spustit legislativní událost, <strong>B</strong> jen feed.
          Agent sbírá jen <strong>aktivní</strong> zdroje typu <strong>rss</strong> s funkční feed URL.
        </p>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zdroj</TableHead>
              <TableHead>Skupina</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Feed / URL</TableHead>
              <TableHead>Aktivní</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((item) => (
              <SourceRow key={item.id} item={item} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

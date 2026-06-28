import { createClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DigestPreview } from "./digest-preview";

export const dynamic = "force-dynamic";

interface DigestRow {
  id: string;
  week_of: string;
  status: string;
  empty: boolean;
  items_summary: string | null;
  html: string | null;
  sent_at: string | null;
}

export default async function DigestsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("digests")
    .select("id, week_of, status, empty, items_summary, html, sent_at")
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as DigestRow[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Digesty</h1>
        <p className="text-sm text-muted-foreground">Drafty (neděle) a odeslané (pondělí).</p>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Týden</TableHead>
              <TableHead>Stav</TableHead>
              <TableHead>Obsah</TableHead>
              <TableHead>Odesláno</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.week_of}</TableCell>
                <TableCell>
                  <Badge variant={d.status === "sent" ? "default" : "secondary"}>{d.status}</Badge>
                  {d.empty && <span className="ml-2 text-xs text-muted-foreground">prázdný</span>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{d.items_summary ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {d.sent_at ? new Date(d.sent_at).toLocaleString("cs-CZ") : "—"}
                </TableCell>
                <TableCell>
                  <DigestPreview weekOf={d.week_of} html={d.html} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

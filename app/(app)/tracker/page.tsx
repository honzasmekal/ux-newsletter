import { createClient } from "@/lib/supabase/server";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrackerRow, type TrackerRowData } from "./tracker-row";

export const dynamic = "force-dynamic";

export default async function TrackerPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tracker")
    .select("id, title, status, effective_date, remediation_weight, fired_flags, confirmed")
    .order("confirmed", { ascending: true })
    .order("id");

  const rows = (data ?? []) as TrackerRowData[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Legislativa</h1>
        <p className="text-sm text-muted-foreground">
          Ověř datum účinnosti z primárního zdroje, pak polož přepínač <strong>Potvrzeno</strong> —
          teprve potvrzená položka se dostane do odpočtů a newsletteru.
        </p>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Položka</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Náročnost</TableHead>
              <TableHead>Účinnost</TableHead>
              <TableHead>Vypálené flagy</TableHead>
              <TableHead>Potvrzeno</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((item) => (
              <TrackerRow key={item.id} item={item} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

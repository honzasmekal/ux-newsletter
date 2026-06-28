import { createClient } from "@/lib/supabase/server";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addRecipient } from "./actions";
import { RecipientRow, type RecipientRowData } from "./recipient-row";

export const dynamic = "force-dynamic";

export default async function RecipientsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recipients")
    .select("id, email, name, active")
    .order("created_at");

  const rows = (data ?? []) as RecipientRowData[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Příjemci</h1>
        <p className="text-sm text-muted-foreground">Komu se v pondělí rozesílá newsletter.</p>
      </div>

      <form action={addRecipient} className="flex flex-wrap items-end gap-3">
        <Input name="email" type="email" placeholder="email@firma.cz" required className="w-64" />
        <Input name="name" placeholder="Jméno (volitelné)" className="w-48" />
        <Button type="submit">Přidat</Button>
      </form>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-mail</TableHead>
              <TableHead>Jméno</TableHead>
              <TableHead>Aktivní</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((item) => (
              <RecipientRow key={item.id} item={item} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

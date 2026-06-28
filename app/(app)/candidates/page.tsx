import { createClient } from "@/lib/supabase/server";
import { CandidateCard, type CandidateData } from "./candidate-card";

export const dynamic = "force-dynamic";

export default async function CandidatesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("candidates")
    .select("id, type, diff, source_url, proposed, tracker:tracker_id(id, title, status, effective_date)")
    .eq("status", "pending")
    .order("created_at");

  const rows = (data ?? []) as unknown as CandidateData[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Kandidáti</h1>
        <p className="text-sm text-muted-foreground">
          Agent navrhuje, ty rozhoduješ. „Sloučit" připojí novinku k existující položce, „Schválit"
          založí novou. Newsletter běží i bez vyřízení — tohle není blokující.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Žádní nevyřízení kandidáti. 🎉</p>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((item) => (
            <CandidateCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

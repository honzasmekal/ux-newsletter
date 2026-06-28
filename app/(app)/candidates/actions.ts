"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function slugify(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "polozka"
  );
}

interface ProposedShape {
  title?: string;
  lastMaterialChange?: { date?: string; note?: string };
}

/** Schválí kandidáta: u 'update' sloučí do trackeru, u 'nová' založí položku (confirmed=false). */
export async function approveCandidate(id: string) {
  const supabase = await createClient();
  const { data: cand, error: e1 } = await supabase
    .from("candidates")
    .select("id, type, proposed, tracker_id")
    .eq("id", id)
    .single();
  if (e1 || !cand) throw new Error(e1?.message ?? "Kandidát nenalezen");

  const proposed = (cand.proposed ?? {}) as ProposedShape;

  if (cand.type === "update" && cand.tracker_id) {
    const lmc = proposed.lastMaterialChange;
    const { error } = await supabase
      .from("tracker")
      .update({
        last_material_change_date: lmc?.date || null,
        last_material_change_note: lmc?.note || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cand.tracker_id);
    if (error) throw new Error(error.message);
  } else if (cand.type === "nová") {
    const title = proposed.title ?? "Nová položka";
    const newId = `${slugify(title)}-${id.slice(0, 6)}`;
    const { error } = await supabase.from("tracker").insert({
      id: newId,
      title,
      status: "navrženo",
      remediation_weight: "lehká",
      confirmed: false,
    });
    if (error) throw new Error(error.message);
  }

  const { error: e2 } = await supabase
    .from("candidates")
    .update({ status: "approved" })
    .eq("id", id);
  if (e2) throw new Error(e2.message);

  revalidatePath("/candidates");
  revalidatePath("/tracker");
  revalidatePath("/");
}

export async function rejectCandidate(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("candidates").update({ status: "rejected" }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/candidates");
  revalidatePath("/");
}

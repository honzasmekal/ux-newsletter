"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setConfirmed(id: string, confirmed: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("tracker").update({ confirmed }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/tracker");
  revalidatePath("/");
}

export async function setEffectiveDate(id: string, date: string | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tracker")
    .update({ effective_date: date || null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/tracker");
}

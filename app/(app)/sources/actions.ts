"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setSourceActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("sources").update({ active }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/sources");
  revalidatePath("/");
}

export async function setSourceUrl(id: string, url: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("sources").update({ url }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/sources");
}

export async function setSourceType(id: string, type: "rss" | "html") {
  const supabase = await createClient();
  const { error } = await supabase.from("sources").update({ type }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/sources");
}

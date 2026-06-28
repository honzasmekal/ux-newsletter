"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addRecipient(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!email) return;
  const supabase = await createClient();
  const { error } = await supabase.from("recipients").insert({ email, name: name || null });
  if (error) throw new Error(error.message);
  revalidatePath("/recipients");
  revalidatePath("/");
}

export async function setRecipientActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("recipients").update({ active }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/recipients");
  revalidatePath("/");
}

export async function deleteRecipient(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("recipients").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/recipients");
  revalidatePath("/");
}

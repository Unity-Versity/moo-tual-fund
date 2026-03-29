"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function updatePrepOption(slotCutId: string, prepOptionId: string | null) {
  await requireHousehold();

  const supabase = await createServiceRoleClient();
  const { error } = await supabase
    .from("slot_cuts")
    .update({ selected_prep_option_id: prepOptionId })
    .eq("id", slotCutId);

  if (error) {
    return { error: "Failed to update. Give it another go!" };
  }

  revalidatePath("/my-order");
  return { success: true };
}

export async function submitSuggestion(message: string, slotCutId?: string) {
  const session = await requireHousehold();

  if (!message.trim()) {
    return { error: "Can't submit an empty suggestion!" };
  }

  const supabase = await createServiceRoleClient();
  const { error } = await supabase.from("suggestions").insert({
    household_id: session.household_id,
    slot_cut_id: slotCutId || null,
    message: message.trim(),
  });

  if (error) {
    return { error: "Failed to submit. Try again!" };
  }

  revalidatePath("/my-order");
  return { success: true };
}

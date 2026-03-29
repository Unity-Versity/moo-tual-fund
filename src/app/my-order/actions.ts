"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function updatePrepOption(slotCutId: string, prepOptionId: string | null) {
  const session = await requireHousehold();
  const supabase = await createServiceRoleClient();

  // Verify this slot_cut belongs to one of the caller's slots
  const { data: slotCut } = await supabase
    .from("slot_cuts")
    .select("slot_id")
    .eq("id", slotCutId)
    .single();

  if (!slotCut) {
    return { error: "Cut allocation not found." };
  }

  const { data: slot } = await supabase
    .from("slots")
    .select("household_id")
    .eq("id", slotCut.slot_id)
    .single();

  if (!slot || slot.household_id !== session.household_id) {
    return { error: "You can only update your own order!" };
  }

  const { error } = await supabase
    .from("slot_cuts")
    .update({ selected_prep_option_id: prepOptionId || null })
    .eq("id", slotCutId);

  if (error) {
    return { error: "Failed to update. Give it another go!" };
  }

  revalidatePath("/my-order");
  return { success: true };
}

export async function submitSuggestion(message: string) {
  const session = await requireHousehold();

  if (!message || !message.trim()) {
    return { error: "Can't submit an empty suggestion!" };
  }

  const supabase = await createServiceRoleClient();
  const { error } = await supabase.from("suggestions").insert({
    household_id: session.household_id,
    message: message.trim(),
  });

  if (error) {
    return { error: "Failed to submit. Try again!" };
  }

  revalidatePath("/my-order");
  return { success: true };
}

"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { suggestionSchema } from "@/lib/validations";

export async function setShareCount(desired: number) {
  const session = await requireHousehold();
  const supabase = await createServiceRoleClient();

  if (desired < 0 || desired > 8 || !Number.isInteger(desired)) {
    return { error: "Pick between 0 and 8 shares." };
  }

  // How many slots does this household already have?
  const { data: mySlots } = await supabase
    .from("slots")
    .select("id")
    .eq("household_id", session.household_id)
    .eq("is_claimed", true)
    .order("slot_number");

  const current = mySlots?.length ?? 0;
  const diff = desired - current;

  if (diff === 0) return { success: true };

  if (diff > 0) {
    // Claim more slots
    const { data: available } = await supabase
      .from("slots")
      .select("id")
      .eq("is_claimed", false)
      .order("slot_number")
      .limit(diff);

    if (!available || available.length < diff) {
      return { error: `Only ${available?.length ?? 0} shares left — not enough for your request.` };
    }

    const slotIds = available.map((s) => s.id);

    // Claim the slots
    const { error: claimError } = await supabase
      .from("slots")
      .update({
        household_id: session.household_id,
        is_claimed: true,
        claimed_at: new Date().toISOString(),
      })
      .in("id", slotIds);

    if (claimError) return { error: "Failed to claim shares. Try again!" };

    // Create slot_cuts for each new slot
    const { data: cuts } = await supabase
      .from("cuts")
      .select("id, portions_per_slot");

    if (cuts && cuts.length > 0) {
      const slotCuts = slotIds.flatMap((slotId) =>
        cuts.flatMap((cut) =>
          Array.from({ length: cut.portions_per_slot }, (_, i) => ({
            slot_id: slotId,
            cut_id: cut.id,
            portion_number: i + 1,
          }))
        )
      );

      const { error: insertError } = await supabase
        .from("slot_cuts")
        .insert(slotCuts);

      if (insertError) {
        // Rollback the claim
        await supabase
          .from("slots")
          .update({ household_id: null, is_claimed: false, claimed_at: null })
          .in("id", slotIds);
        return { error: "Something went wrong setting up your cuts. Try again!" };
      }
    }
  } else {
    // Release slots (remove from the end)
    const toRelease = mySlots!.slice(diff); // diff is negative, so this takes the last |diff| items
    const releaseIds = toRelease.map((s) => s.id);

    await supabase.from("slot_cuts").delete().in("slot_id", releaseIds);

    const { error: releaseError } = await supabase
      .from("slots")
      .update({ household_id: null, is_claimed: false, claimed_at: null })
      .in("id", releaseIds);

    if (releaseError) return { error: "Failed to release shares. Try again!" };
  }

  revalidatePath("/my-order");
  revalidatePath("/");
  return { success: true };
}

export async function updatePrepOption(slotCutId: string, prepOptionId: string | null) {
  const session = await requireHousehold();

  if (!slotCutId) {
    return { error: "Cut allocation ID is required." };
  }

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

  const parsed = suggestionSchema.safeParse({ message });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createServiceRoleClient();
  const { error } = await supabase.from("suggestions").insert({
    household_id: session.household_id,
    message: parsed.data.message,
  });

  if (error) {
    return { error: "Failed to submit. Try again!" };
  }

  revalidatePath("/my-order");
  return { success: true };
}

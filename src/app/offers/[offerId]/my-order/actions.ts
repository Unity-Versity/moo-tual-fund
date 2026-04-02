"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { suggestionSchema } from "@/lib/validations";

export async function setShareCount(offerId: string, desired: number) {
  const session = await requireHousehold();
  const supabase = await createServiceRoleClient();

  // Get total_slots for this offer
  const { data: offer } = await supabase
    .from("offers")
    .select("total_slots, status")
    .eq("id", offerId)
    .single();

  if (!offer) return { error: "Offer not found." };
  if (offer.status !== "open") return { error: "This offer is no longer accepting claims." };

  const maxSlots = offer.total_slots;
  if (desired < 0 || desired > maxSlots || !Number.isInteger(desired)) {
    return { error: `Pick between 0 and ${maxSlots} shares.` };
  }

  // How many slots does this household already have for this offer?
  const { data: mySlots } = await supabase
    .from("offer_slots")
    .select("id")
    .eq("offer_id", offerId)
    .eq("household_id", session.household_id)
    .eq("is_claimed", true)
    .order("slot_number");

  const current = mySlots?.length ?? 0;
  const diff = desired - current;

  if (diff === 0) return { success: true };

  if (diff > 0) {
    // Claim more slots
    const { data: available } = await supabase
      .from("offer_slots")
      .select("id")
      .eq("offer_id", offerId)
      .eq("is_claimed", false)
      .order("slot_number")
      .limit(diff);

    if (!available || available.length < diff) {
      return { error: `Only ${available?.length ?? 0} shares left — not enough for your request.` };
    }

    const slotIds = available.map((s) => s.id);

    // Claim the slots
    const { error: claimError } = await supabase
      .from("offer_slots")
      .update({
        household_id: session.household_id,
        is_claimed: true,
        claimed_at: new Date().toISOString(),
      })
      .in("id", slotIds);

    if (claimError) return { error: "Failed to claim shares. Try again!" };

    // Create offer_slot_cuts for each new slot
    const { data: cuts } = await supabase
      .from("offer_cuts")
      .select("id, portions_per_slot")
      .eq("offer_id", offerId);

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
        .from("offer_slot_cuts")
        .insert(slotCuts);

      if (insertError) {
        // Rollback the claim
        await supabase
          .from("offer_slots")
          .update({ household_id: null, is_claimed: false, claimed_at: null })
          .in("id", slotIds);
        return { error: "Something went wrong setting up your cuts. Try again!" };
      }
    }
  } else {
    // Release slots (remove from the end)
    const toRelease = mySlots!.slice(diff); // diff is negative
    const releaseIds = toRelease.map((s) => s.id);

    await supabase.from("offer_slot_cuts").delete().in("slot_id", releaseIds);

    const { error: releaseError } = await supabase
      .from("offer_slots")
      .update({ household_id: null, is_claimed: false, claimed_at: null })
      .in("id", releaseIds);

    if (releaseError) return { error: "Failed to release shares. Try again!" };
  }

  revalidatePath(`/offers/${offerId}/my-order`);
  revalidatePath(`/offers/${offerId}`);
  revalidatePath("/offers");
  return { success: true };
}

export async function updatePrepOption(offerId: string, slotCutId: string, prepOptionId: string | null) {
  const session = await requireHousehold();

  if (!slotCutId) {
    return { error: "Cut allocation ID is required." };
  }

  const supabase = await createServiceRoleClient();

  // Verify this slot_cut belongs to one of the caller's slots
  const { data: slotCut } = await supabase
    .from("offer_slot_cuts")
    .select("slot_id")
    .eq("id", slotCutId)
    .single();

  if (!slotCut) {
    return { error: "Cut allocation not found." };
  }

  const { data: slot } = await supabase
    .from("offer_slots")
    .select("household_id")
    .eq("id", slotCut.slot_id)
    .single();

  if (!slot || slot.household_id !== session.household_id) {
    return { error: "You can only update your own order!" };
  }

  const { error } = await supabase
    .from("offer_slot_cuts")
    .update({ selected_prep_option_id: prepOptionId || null })
    .eq("id", slotCutId);

  if (error) {
    return { error: "Failed to update. Give it another go!" };
  }

  revalidatePath(`/offers/${offerId}/my-order`);
  return { success: true };
}

export async function submitSuggestion(offerId: string, message: string) {
  const session = await requireHousehold();

  const parsed = suggestionSchema.safeParse({ message });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createServiceRoleClient();
  const { error } = await supabase.from("suggestions").insert({
    household_id: session.household_id,
    offer_id: offerId,
    message: parsed.data.message,
  });

  if (error) {
    return { error: "Failed to submit. Try again!" };
  }

  revalidatePath(`/offers/${offerId}/my-order`);
  return { success: true };
}

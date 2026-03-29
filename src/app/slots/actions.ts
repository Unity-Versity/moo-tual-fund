"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function claimSlot(slotId: string) {
  const session = await getSession();
  if (!session || session.type !== "household" || !session.household_id) {
    return { error: "You need to log in first!" };
  }

  const supabase = await createServiceRoleClient();

  const { data: slot, error: fetchError } = await supabase
    .from("slots")
    .select("is_claimed")
    .eq("id", slotId)
    .single();

  if (fetchError || !slot) {
    return { error: "Slot not found." };
  }

  if (slot.is_claimed) {
    return { error: "This slot is already claimed! Someone beat you to it." };
  }

  const { error } = await supabase
    .from("slots")
    .update({
      household_id: session.household_id,
      is_claimed: true,
      claimed_at: new Date().toISOString(),
    })
    .eq("id", slotId)
    .eq("is_claimed", false); // optimistic lock

  if (error) {
    return { error: "Failed to claim slot. Try again!" };
  }

  const { data: cuts } = await supabase
    .from("cuts")
    .select("id, portions_per_slot");

  if (cuts && cuts.length > 0) {
    const slotCuts = cuts.flatMap((cut) =>
      Array.from({ length: cut.portions_per_slot }, (_, i) => ({
        slot_id: slotId,
        cut_id: cut.id,
        portion_number: i + 1,
      }))
    );

    const { error: insertError } = await supabase.from("slot_cuts").insert(slotCuts);
    if (insertError) {
      console.error("Failed to create slot_cuts:", insertError);
    }
  }

  revalidatePath("/slots");
  revalidatePath("/");
  revalidatePath("/my-order");
  return { success: true };
}

export async function unclaimSlot(slotId: string) {
  const session = await getSession();
  if (!session) {
    return { error: "You need to log in first!" };
  }

  const supabase = await createServiceRoleClient();

  // Verify ownership: household can only release their own slots, admin can release any
  if (session.type === "household") {
    const { data: slot } = await supabase
      .from("slots")
      .select("household_id")
      .eq("id", slotId)
      .single();

    if (!slot || slot.household_id !== session.household_id) {
      return { error: "You can only release your own slots!" };
    }
  }

  await supabase.from("slot_cuts").delete().eq("slot_id", slotId);

  const { error } = await supabase
    .from("slots")
    .update({
      household_id: null,
      is_claimed: false,
      claimed_at: null,
    })
    .eq("id", slotId);

  if (error) {
    return { error: "Failed to release slot. Try again!" };
  }

  revalidatePath("/slots");
  revalidatePath("/");
  revalidatePath("/my-order");
  return { success: true };
}

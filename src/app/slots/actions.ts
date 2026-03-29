"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function claimSlot(slotId: string) {
  const session = await getSession();
  if (!session) {
    return { error: "You need to log in first!" };
  }

  const householdId = session.type === "household" ? session.household_id : null;
  if (!householdId) {
    return { error: "Only households can claim slots." };
  }

  const supabase = await createServiceRoleClient();

  const { data: slot } = await supabase
    .from("slots")
    .select("is_claimed")
    .eq("id", slotId)
    .single();

  if (slot?.is_claimed) {
    return { error: "This slot is already claimed! Someone beat you to it." };
  }

  const { error } = await supabase
    .from("slots")
    .update({
      household_id: householdId,
      is_claimed: true,
      claimed_at: new Date().toISOString(),
    })
    .eq("id", slotId);

  if (error) {
    return { error: "Failed to claim slot. Try again!" };
  }

  // Auto-generate slot_cuts for this slot
  const { data: cuts } = await supabase
    .from("cuts")
    .select("id, portions_per_slot");

  if (cuts) {
    const slotCuts = cuts.flatMap((cut) =>
      Array.from({ length: cut.portions_per_slot }, (_, i) => ({
        slot_id: slotId,
        cut_id: cut.id,
        portion_number: i + 1,
      }))
    );

    await supabase.from("slot_cuts").insert(slotCuts);
  }

  revalidatePath("/slots");
  revalidatePath("/");
  return { success: true };
}

export async function unclaimSlot(slotId: string) {
  const session = await getSession();
  if (!session) {
    return { error: "You need to log in first!" };
  }

  const supabase = await createServiceRoleClient();

  // Delete associated slot_cuts
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
  return { success: true };
}

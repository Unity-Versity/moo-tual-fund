"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/session";
import { revalidatePath } from "next/cache";
import {
  createOfferSchema,
  updateOfferStatusSchema,
  createHouseholdSchema,
  addExpenseSchema,
  addPaymentSchema,
  addCutSchema,
  addPrepOptionSchema,
  updateSuggestionStatusSchema,
  parseForm,
} from "@/lib/validations";
import { shareSizeDenominator } from "@/lib/types";
import type { ShareSize } from "@/lib/types";

export async function getHouseholds() {
  await requireAdmin();
  const supabase = await createServiceRoleClient();
  const { data } = await supabase
    .from("households")
    .select("*")
    .order("created_at");
  return data ?? [];
}

// ── Offers ─────────────────────────────────────────────

export async function createOffer(formData: FormData) {
  await requireAdmin();

  const parsed = parseForm(createOfferSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const d = parsed.data;

  const supabase = await createServiceRoleClient();

  const denominator = shareSizeDenominator(d.share_size as ShareSize);

  // Create the offer
  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .insert({
      title: d.title,
      description: d.description || null,
      animal_type: d.animal_type,
      animal_count: d.animal_count,
      share_size: d.share_size,
      source_info: d.source_info || null,
    })
    .select("id")
    .single();

  if (offerError || !offer) {
    return { error: "Failed to create offer." };
  }

  // Create offer_animals
  const animals = Array.from({ length: d.animal_count }, (_, i) => ({
    offer_id: offer.id,
    animal_number: i + 1,
  }));

  const { data: createdAnimals, error: animalsError } = await supabase
    .from("offer_animals")
    .insert(animals)
    .select("id, animal_number");

  if (animalsError || !createdAnimals) {
    return { error: "Failed to create animals." };
  }

  // Create offer_slots (distributed evenly across animals)
  const slotsPerAnimal = denominator;
  const slots = createdAnimals.flatMap((animal) =>
    Array.from({ length: slotsPerAnimal }, (_, i) => ({
      offer_id: offer.id,
      animal_id: animal.id,
      slot_number: (animal.animal_number - 1) * slotsPerAnimal + i + 1,
    }))
  );

  const { error: slotsError } = await supabase
    .from("offer_slots")
    .insert(slots);

  if (slotsError) {
    return { error: "Failed to create slots." };
  }

  // Load cut templates for this animal type
  const { data: templates } = await supabase
    .from("cut_templates")
    .select("*, prep_option_templates(*)")
    .eq("animal_type", d.animal_type)
    .order("display_order");

  if (templates && templates.length > 0) {
    // Create offer_cuts from templates
    const offerCuts = templates.map((t) => ({
      offer_id: offer.id,
      name: t.name,
      category: t.category,
      est_weight_per_slot_kg: t.est_weight_per_slot_kg,
      is_processable: t.is_processable,
      display_order: t.display_order,
      portions_per_slot: t.portions_per_slot,
    }));

    const { data: createdCuts } = await supabase
      .from("offer_cuts")
      .insert(offerCuts)
      .select("id, name");

    if (createdCuts) {
      // Create offer_prep_options from templates
      const prepOptions = templates.flatMap((t) => {
        const createdCut = createdCuts.find((c) => c.name === t.name);
        if (!createdCut || !t.prep_option_templates) return [];
        return (t.prep_option_templates as { label: string; extra_cost: number; display_order: number }[]).map((po) => ({
          offer_cut_id: createdCut.id,
          label: po.label,
          extra_cost: po.extra_cost,
          display_order: po.display_order,
        }));
      });

      if (prepOptions.length > 0) {
        await supabase.from("offer_prep_options").insert(prepOptions);
      }
    }
  }

  revalidatePath("/admin/offers");
  revalidatePath("/offers");
  return { success: true, offerId: offer.id };
}

export async function updateOfferStatus(offerId: string, formData: FormData) {
  await requireAdmin();

  const parsed = parseForm(updateOfferStatusSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const d = parsed.data;

  const supabase = await createServiceRoleClient();

  const update: Record<string, unknown> = {
    stage: d.stage,
    est_sacrifice_date: d.est_sacrifice_date || null,
    est_raw_pickup: d.est_raw_pickup || null,
    est_smoked_pickup: d.est_smoked_pickup || null,
    banner_message: d.banner_message || null,
    updated_at: new Date().toISOString(),
  };

  if (d.status) {
    update.status = d.status;
  }

  const { error } = await supabase
    .from("offers")
    .update(update)
    .eq("id", offerId);

  if (error) {
    return { error: "Failed to update status." };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateOfferAnimalCount(offerId: string, newCount: number) {
  await requireAdmin();
  const supabase = await createServiceRoleClient();

  const { data: offer } = await supabase
    .from("offers")
    .select("animal_count, share_size")
    .eq("id", offerId)
    .single();

  if (!offer) return { error: "Offer not found." };
  if (newCount < 1) return { error: "Must have at least 1 animal." };
  if (newCount === offer.animal_count) return { success: true };

  const denominator = shareSizeDenominator(offer.share_size as ShareSize);

  if (newCount > offer.animal_count) {
    // Add more animals and slots
    const startAnimal = offer.animal_count + 1;
    for (let i = startAnimal; i <= newCount; i++) {
      const { data: animal, error: animalError } = await supabase
        .from("offer_animals")
        .insert({ offer_id: offerId, animal_number: i })
        .select("id")
        .single();

      if (animalError || !animal) return { error: "Failed to add animal." };

      const baseSlotNumber = (i - 1) * denominator;
      const newSlots = Array.from({ length: denominator }, (_, j) => ({
        offer_id: offerId,
        animal_id: animal.id,
        slot_number: baseSlotNumber + j + 1,
      }));

      const { error: slotsError } = await supabase
        .from("offer_slots")
        .insert(newSlots);

      if (slotsError) return { error: "Failed to add slots." };
    }
  } else {
    // Remove animals (from the end) — only if their slots are unclaimed
    for (let i = offer.animal_count; i > newCount; i--) {
      const { data: animal } = await supabase
        .from("offer_animals")
        .select("id")
        .eq("offer_id", offerId)
        .eq("animal_number", i)
        .single();

      if (!animal) continue;

      // Check if any slots for this animal are claimed
      const { data: claimedSlots } = await supabase
        .from("offer_slots")
        .select("id")
        .eq("animal_id", animal.id)
        .eq("is_claimed", true);

      if (claimedSlots && claimedSlots.length > 0) {
        return { error: `Animal ${i} has claimed slots. Release those first.` };
      }

      // Delete slots and animal (cascade)
      await supabase.from("offer_slots").delete().eq("animal_id", animal.id);
      await supabase.from("offer_animals").delete().eq("id", animal.id);
    }
  }

  // Update the animal_count on the offer
  const { error } = await supabase
    .from("offers")
    .update({ animal_count: newCount, updated_at: new Date().toISOString() })
    .eq("id", offerId);

  if (error) return { error: "Failed to update animal count." };

  revalidatePath(`/admin/offers/${offerId}`);
  revalidatePath(`/offers/${offerId}`);
  revalidatePath("/offers");
  return { success: true };
}

export async function updateAnimalWeight(animalId: string, hangingWeight: number | null, takeHomeWeight: number | null) {
  await requireAdmin();
  const supabase = await createServiceRoleClient();

  const { error } = await supabase
    .from("offer_animals")
    .update({
      hanging_weight_kg: hangingWeight,
      total_take_home_kg: takeHomeWeight,
    })
    .eq("id", animalId);

  if (error) return { error: "Failed to update weight." };

  revalidatePath("/", "layout");
  return { success: true };
}

export async function toggleWeightsConfirmed(offerId: string, confirmed: boolean) {
  await requireAdmin();
  const supabase = await createServiceRoleClient();

  const { error } = await supabase
    .from("offers")
    .update({ weights_confirmed: confirmed, updated_at: new Date().toISOString() })
    .eq("id", offerId);

  if (error) return { error: "Failed to toggle weights." };

  revalidatePath("/", "layout");
  return { success: true };
}

// ── Households ──────────────────────────────────────────

export async function createHousehold(formData: FormData) {
  await requireAdmin();

  const parsed = parseForm(createHouseholdSchema, formData);
  if (!parsed.success) return { error: parsed.error };

  const supabase = await createServiceRoleClient();
  const invite_token = crypto.randomUUID();

  const { error } = await supabase.from("households").insert({
    name: parsed.data.name,
    invite_token,
    contact_info: parsed.data.contact_info || null,
    is_active: false,
  });

  if (error) {
    return { error: "Failed to create household." };
  }

  revalidatePath("/admin/households");
  return { success: true, invite_token };
}

export async function regenerateInvite(householdId: string) {
  await requireAdmin();
  const supabase = await createServiceRoleClient();

  const invite_token = crypto.randomUUID();
  const { error } = await supabase
    .from("households")
    .update({ invite_token, pin_code: null, is_active: false })
    .eq("id", householdId);

  if (error) {
    return { error: "Failed to regenerate invite." };
  }

  revalidatePath("/admin/households");
  return { success: true, invite_token };
}

export async function toggleHousehold(householdId: string, isActive: boolean) {
  await requireAdmin();
  const supabase = await createServiceRoleClient();

  const { error } = await supabase
    .from("households")
    .update({ is_active: isActive })
    .eq("id", householdId);

  if (error) {
    return { error: "Failed to update household." };
  }

  revalidatePath("/admin/households");
  return { success: true };
}

// ── Expenses (offer-scoped) ─────────────────────────────

export async function addExpense(offerId: string, formData: FormData) {
  await requireAdmin();

  const parsed = parseForm(addExpenseSchema, formData);
  if (!parsed.success) return { error: parsed.error };

  const supabase = await createServiceRoleClient();

  const { error } = await supabase.from("expenses").insert({
    description: parsed.data.description,
    amount: parsed.data.amount,
    category: parsed.data.category,
    offer_id: offerId,
  });

  if (error) {
    return { error: "Failed to add expense." };
  }

  revalidatePath(`/admin/offers/${offerId}/expenses`);
  revalidatePath(`/offers/${offerId}/costs`);
  return { success: true };
}

export async function deleteExpense(offerId: string, id: string) {
  await requireAdmin();
  const supabase = await createServiceRoleClient();

  const { error } = await supabase.from("expenses").delete().eq("id", id);

  if (error) {
    return { error: "Failed to delete expense." };
  }

  revalidatePath(`/admin/offers/${offerId}/expenses`);
  revalidatePath(`/offers/${offerId}/costs`);
  return { success: true };
}

// ── Payments (offer-scoped) ─────────────────────────────

export async function addPayment(offerId: string, formData: FormData) {
  await requireAdmin();

  const parsed = parseForm(addPaymentSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const d = parsed.data;

  const supabase = await createServiceRoleClient();

  const { error } = await supabase.from("payments").insert({
    household_id: d.household_id,
    amount: d.amount,
    method: d.method,
    payment_date: d.payment_date || new Date().toISOString().split("T")[0],
    notes: d.notes || null,
    offer_id: offerId,
  });

  if (error) {
    return { error: "Failed to add payment." };
  }

  revalidatePath(`/admin/offers/${offerId}/payments`);
  revalidatePath(`/offers/${offerId}/costs`);
  return { success: true };
}

export async function deletePayment(offerId: string, id: string) {
  await requireAdmin();
  const supabase = await createServiceRoleClient();

  const { error } = await supabase.from("payments").delete().eq("id", id);

  if (error) {
    return { error: "Failed to delete payment." };
  }

  revalidatePath(`/admin/offers/${offerId}/payments`);
  revalidatePath(`/offers/${offerId}/costs`);
  return { success: true };
}

// ── Cuts (offer-scoped) ─────────────────────────────────

export async function addCut(offerId: string, formData: FormData) {
  await requireAdmin();

  const parsed = parseForm(addCutSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const d = parsed.data;

  const supabase = await createServiceRoleClient();

  const { data: maxOrder } = await supabase
    .from("offer_cuts")
    .select("display_order")
    .eq("offer_id", offerId)
    .order("display_order", { ascending: false })
    .limit(1)
    .single();

  const { error } = await supabase.from("offer_cuts").insert({
    offer_id: offerId,
    name: d.name,
    category: d.category,
    est_weight_per_slot_kg: d.est_weight_per_slot_kg,
    is_processable: d.is_processable,
    display_order: (maxOrder?.display_order ?? 0) + 1,
    portions_per_slot: d.portions_per_slot,
  });

  if (error) {
    return { error: "Failed to add cut. Name may already exist." };
  }

  revalidatePath(`/admin/offers/${offerId}/cuts`);
  return { success: true };
}

export async function deleteCut(offerId: string, id: string) {
  await requireAdmin();
  const supabase = await createServiceRoleClient();

  const { error } = await supabase.from("offer_cuts").delete().eq("id", id);

  if (error) {
    return { error: "Failed to delete cut." };
  }

  revalidatePath(`/admin/offers/${offerId}/cuts`);
  return { success: true };
}

export async function addPrepOption(offerId: string, formData: FormData) {
  await requireAdmin();

  const parsed = parseForm(addPrepOptionSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const d = parsed.data;

  const supabase = await createServiceRoleClient();

  const { data: maxOrder } = await supabase
    .from("offer_prep_options")
    .select("display_order")
    .eq("offer_cut_id", d.cut_id)
    .order("display_order", { ascending: false })
    .limit(1)
    .single();

  const { error } = await supabase.from("offer_prep_options").insert({
    offer_cut_id: d.cut_id,
    label: d.label,
    extra_cost: d.extra_cost,
    display_order: (maxOrder?.display_order ?? 0) + 1,
  });

  if (error) {
    return { error: "Failed to add prep option. Label may already exist for this cut." };
  }

  revalidatePath(`/admin/offers/${offerId}/cuts`);
  return { success: true };
}

export async function deletePrepOption(offerId: string, id: string) {
  await requireAdmin();
  const supabase = await createServiceRoleClient();

  const { error } = await supabase.from("offer_prep_options").delete().eq("id", id);

  if (error) {
    return { error: "Failed to delete prep option." };
  }

  revalidatePath(`/admin/offers/${offerId}/cuts`);
  return { success: true };
}

// ── Weights (offer-scoped) ──────────────────────────────

export async function updateCutTotalWeight(offerId: string, cutId: string, animalId: string, totalWeight: number | null) {
  await requireAdmin();
  const supabase = await createServiceRoleClient();

  // Get all slot_cuts for this cut in claimed slots of this animal
  const { data: slotCuts, error: fetchError } = await supabase
    .from("offer_slot_cuts")
    .select("id, slot:offer_slots!inner(is_claimed, animal_id)")
    .eq("cut_id", cutId)
    .eq("slot.is_claimed", true)
    .eq("slot.animal_id", animalId);

  if (fetchError) {
    return { error: "Failed to fetch slot cuts." };
  }

  if (!slotCuts || slotCuts.length === 0) {
    // If no claimed slots, just succeed silently
    return { success: true };
  }

  const weightPerSlotCut = totalWeight != null ? totalWeight / slotCuts.length : null;

  const ids = slotCuts.map((sc) => sc.id);
  const { error } = await supabase
    .from("offer_slot_cuts")
    .update({ actual_weight_kg: weightPerSlotCut })
    .in("id", ids);

  if (error) {
    return { error: "Failed to update weights." };
  }

  revalidatePath(`/admin/offers/${offerId}/weights`);
  revalidatePath(`/offers/${offerId}/my-order`);
  return { success: true };
}

// ── Suggestions ─────────────────────────────────────────

export async function updateSuggestionStatus(id: string, status: string) {
  await requireAdmin();

  const parsed = updateSuggestionStatusSchema.safeParse({ id, status });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createServiceRoleClient();

  const { error } = await supabase
    .from("suggestions")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id);

  if (error) {
    return { error: "Failed to update suggestion." };
  }

  revalidatePath("/admin");
  return { success: true };
}

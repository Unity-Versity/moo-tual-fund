"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/session";
import { revalidatePath } from "next/cache";
import {
  updateCowStatusSchema,
  createHouseholdSchema,
  addExpenseSchema,
  addPaymentSchema,
  addCutSchema,
  addPrepOptionSchema,
  updateSuggestionStatusSchema,
  parseForm,
} from "@/lib/validations";

export async function getHouseholds() {
  await requireAdmin();
  const supabase = await createServiceRoleClient();
  const { data } = await supabase
    .from("households")
    .select("*")
    .order("created_at");
  return data ?? [];
}

// ── Status ──────────────────────────────────────────────

export async function updateCowStatus(formData: FormData) {
  await requireAdmin();

  const parsed = parseForm(updateCowStatusSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const d = parsed.data;

  const supabase = await createServiceRoleClient();

  const { data: existing } = await supabase
    .from("cow_status")
    .select("id")
    .limit(1)
    .single();

  if (!existing) {
    return { error: "No cow status record found." };
  }

  const { error } = await supabase
    .from("cow_status")
    .update({
      stage: d.stage,
      est_sacrifice_date: d.est_sacrifice_date || null,
      hanging_weight_kg: d.hanging_weight_kg ? Number(d.hanging_weight_kg) : null,
      total_take_home_kg: d.total_take_home_kg ? Number(d.total_take_home_kg) : null,
      est_raw_pickup: d.est_raw_pickup || null,
      est_smoked_pickup: d.est_smoked_pickup || null,
      banner_message: d.banner_message || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  if (error) {
    return { error: "Failed to update status." };
  }

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

// ── Expenses ────────────────────────────────────────────

export async function addExpense(formData: FormData) {
  await requireAdmin();

  const parsed = parseForm(addExpenseSchema, formData);
  if (!parsed.success) return { error: parsed.error };

  const supabase = await createServiceRoleClient();

  const { error } = await supabase.from("expenses").insert({
    description: parsed.data.description,
    amount: parsed.data.amount,
    category: parsed.data.category,
  });

  if (error) {
    return { error: "Failed to add expense." };
  }

  revalidatePath("/admin/expenses");
  revalidatePath("/costs");
  return { success: true };
}

export async function deleteExpense(id: string) {
  await requireAdmin();
  const supabase = await createServiceRoleClient();

  const { error } = await supabase.from("expenses").delete().eq("id", id);

  if (error) {
    return { error: "Failed to delete expense." };
  }

  revalidatePath("/admin/expenses");
  revalidatePath("/costs");
  return { success: true };
}

// ── Payments ────────────────────────────────────────────

export async function addPayment(formData: FormData) {
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
  });

  if (error) {
    return { error: "Failed to add payment." };
  }

  revalidatePath("/admin/payments");
  revalidatePath("/costs");
  return { success: true };
}

export async function deletePayment(id: string) {
  await requireAdmin();
  const supabase = await createServiceRoleClient();

  const { error } = await supabase.from("payments").delete().eq("id", id);

  if (error) {
    return { error: "Failed to delete payment." };
  }

  revalidatePath("/admin/payments");
  revalidatePath("/costs");
  return { success: true };
}

// ── Cuts ────────────────────────────────────────────────

export async function addCut(formData: FormData) {
  await requireAdmin();

  const parsed = parseForm(addCutSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const d = parsed.data;

  const supabase = await createServiceRoleClient();

  const { data: maxOrder } = await supabase
    .from("cuts")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .single();

  const { error } = await supabase.from("cuts").insert({
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

  revalidatePath("/admin/cuts");
  return { success: true };
}

export async function deleteCut(id: string) {
  await requireAdmin();
  const supabase = await createServiceRoleClient();

  const { error } = await supabase.from("cuts").delete().eq("id", id);

  if (error) {
    return { error: "Failed to delete cut." };
  }

  revalidatePath("/admin/cuts");
  return { success: true };
}

export async function addPrepOption(formData: FormData) {
  await requireAdmin();

  const parsed = parseForm(addPrepOptionSchema, formData);
  if (!parsed.success) return { error: parsed.error };
  const d = parsed.data;

  const supabase = await createServiceRoleClient();

  const { data: maxOrder } = await supabase
    .from("prep_options")
    .select("display_order")
    .eq("cut_id", d.cut_id)
    .order("display_order", { ascending: false })
    .limit(1)
    .single();

  const { error } = await supabase.from("prep_options").insert({
    cut_id: d.cut_id,
    label: d.label,
    extra_cost: d.extra_cost,
    display_order: (maxOrder?.display_order ?? 0) + 1,
  });

  if (error) {
    return { error: "Failed to add prep option. Label may already exist for this cut." };
  }

  revalidatePath("/admin/cuts");
  return { success: true };
}

export async function deletePrepOption(id: string) {
  await requireAdmin();
  const supabase = await createServiceRoleClient();

  const { error } = await supabase.from("prep_options").delete().eq("id", id);

  if (error) {
    return { error: "Failed to delete prep option." };
  }

  revalidatePath("/admin/cuts");
  return { success: true };
}

// ── Weights ─────────────────────────────────────────────

export async function updateActualWeight(slotCutId: string, weight: number | null) {
  await requireAdmin();
  const supabase = await createServiceRoleClient();

  const { error } = await supabase
    .from("slot_cuts")
    .update({ actual_weight_kg: weight })
    .eq("id", slotCutId);

  if (error) {
    return { error: "Failed to update weight." };
  }

  revalidatePath("/admin/weights");
  revalidatePath("/my-order");
  return { success: true };
}

export async function updateCutTotalWeight(cutId: string, totalWeight: number | null) {
  await requireAdmin();
  const supabase = await createServiceRoleClient();

  // Get all slot_cuts for this cut in claimed slots
  const { data: slotCuts, error: fetchError } = await supabase
    .from("slot_cuts")
    .select("id, slot:slots!inner(is_claimed)")
    .eq("cut_id", cutId)
    .eq("slot.is_claimed", true);

  if (fetchError) {
    return { error: "Failed to fetch slot cuts." };
  }

  if (!slotCuts || slotCuts.length === 0) {
    return { error: "No claimed slots have this cut." };
  }

  const weightPerSlotCut = totalWeight != null ? totalWeight / slotCuts.length : null;

  // Update all slot_cuts for this cut evenly
  const ids = slotCuts.map((sc) => sc.id);
  const { error } = await supabase
    .from("slot_cuts")
    .update({ actual_weight_kg: weightPerSlotCut })
    .in("id", ids);

  if (error) {
    return { error: "Failed to update weights." };
  }

  revalidatePath("/admin/weights");
  revalidatePath("/my-order");
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

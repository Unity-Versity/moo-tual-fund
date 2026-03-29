"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/session";
import { revalidatePath } from "next/cache";
import type { CowStage } from "@/lib/types";

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── Status ──────────────────────────────────────────────

export async function updateCowStatus(formData: FormData) {
  await requireAdmin();
  const supabase = await createServiceRoleClient();

  const stage = formData.get("stage") as CowStage;
  const est_sacrifice_date = formData.get("est_sacrifice_date") as string || null;
  const hanging_weight_kg = formData.get("hanging_weight_kg") as string;
  const total_take_home_kg = formData.get("total_take_home_kg") as string;
  const est_raw_pickup = formData.get("est_raw_pickup") as string || null;
  const est_smoked_pickup = formData.get("est_smoked_pickup") as string || null;
  const banner_message = formData.get("banner_message") as string || null;

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
      stage,
      est_sacrifice_date,
      hanging_weight_kg: hanging_weight_kg ? Number(hanging_weight_kg) : null,
      total_take_home_kg: total_take_home_kg ? Number(total_take_home_kg) : null,
      est_raw_pickup,
      est_smoked_pickup,
      banner_message,
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
  const supabase = await createServiceRoleClient();

  const name = formData.get("name") as string;
  const contact_info = formData.get("contact_info") as string || null;

  if (!name?.trim()) {
    return { error: "Household name is required." };
  }

  const pin = generatePin();

  const { error } = await supabase.from("households").insert({
    name: name.trim(),
    pin_code: pin,
    contact_info,
  });

  if (error) {
    return { error: "Failed to create household." };
  }

  revalidatePath("/admin/households");
  return { success: true, pin };
}

export async function regeneratePin(householdId: string) {
  await requireAdmin();
  const supabase = await createServiceRoleClient();

  const pin = generatePin();
  const { error } = await supabase
    .from("households")
    .update({ pin_code: pin })
    .eq("id", householdId);

  if (error) {
    return { error: "Failed to regenerate PIN." };
  }

  revalidatePath("/admin/households");
  return { success: true, pin };
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
  const supabase = await createServiceRoleClient();

  const description = formData.get("description") as string;
  const amount = formData.get("amount") as string;
  const category = formData.get("category") as string || "general";

  if (!description?.trim() || !amount) {
    return { error: "Description and amount are required." };
  }

  const { error } = await supabase.from("expenses").insert({
    description: description.trim(),
    amount: Number(amount),
    category,
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
  const supabase = await createServiceRoleClient();

  const household_id = formData.get("household_id") as string;
  const amount = formData.get("amount") as string;
  const method = (formData.get("method") as string) || "PayID";
  const payment_date = formData.get("payment_date") as string;
  const notes = formData.get("notes") as string || null;

  if (!household_id || !amount) {
    return { error: "Household and amount are required." };
  }

  const { error } = await supabase.from("payments").insert({
    household_id,
    amount: Number(amount),
    method,
    payment_date: payment_date || new Date().toISOString().split("T")[0],
    notes,
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
  const supabase = await createServiceRoleClient();

  const name = formData.get("name") as string;
  const category = formData.get("category") as string || "other";
  const est_weight_per_slot_kg = formData.get("est_weight_per_slot_kg") as string;
  const is_processable = formData.get("is_processable") === "true";
  const portions_per_slot = formData.get("portions_per_slot") as string || "1";

  if (!name?.trim()) {
    return { error: "Cut name is required." };
  }

  const { data: maxOrder } = await supabase
    .from("cuts")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .single();

  const { error } = await supabase.from("cuts").insert({
    name: name.trim(),
    category,
    est_weight_per_slot_kg: Number(est_weight_per_slot_kg) || 0,
    is_processable,
    display_order: (maxOrder?.display_order ?? 0) + 1,
    portions_per_slot: Number(portions_per_slot) || 1,
  });

  if (error) {
    return { error: "Failed to add cut." };
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
  const supabase = await createServiceRoleClient();

  const cut_id = formData.get("cut_id") as string;
  const label = formData.get("label") as string;
  const extra_cost = formData.get("extra_cost") as string;

  if (!cut_id || !label?.trim()) {
    return { error: "Cut and label are required." };
  }

  const { data: maxOrder } = await supabase
    .from("prep_options")
    .select("display_order")
    .eq("cut_id", cut_id)
    .order("display_order", { ascending: false })
    .limit(1)
    .single();

  const { error } = await supabase.from("prep_options").insert({
    cut_id,
    label: label.trim(),
    extra_cost: Number(extra_cost) || 0,
    display_order: (maxOrder?.display_order ?? 0) + 1,
  });

  if (error) {
    return { error: "Failed to add prep option." };
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

// ── Suggestions ─────────────────────────────────────────

export async function updateSuggestionStatus(id: string, status: string) {
  await requireAdmin();
  const supabase = await createServiceRoleClient();

  const { error } = await supabase
    .from("suggestions")
    .update({ status })
    .eq("id", id);

  if (error) {
    return { error: "Failed to update suggestion." };
  }

  revalidatePath("/admin");
  return { success: true };
}

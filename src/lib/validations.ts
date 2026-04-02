import { z } from "zod";
import { OFFER_STAGES, ANIMAL_TYPES, SHARE_SIZES } from "@/lib/types";

// ── Auth ───────────────────────────────────────────────

export const loginSchema = z.object({
  pin: z
    .string()
    .trim()
    .min(1, "PIN is required")
    .regex(/^\d{4,6}$/, "PIN must be 4–6 digits"),
});

export const activateSchema = z.object({
  token: z.string().trim().min(1, "Invite token is required"),
  pin: z
    .string()
    .trim()
    .regex(/^\d{4,6}$/, "PIN must be 4–6 digits"),
});

export const adminLoginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Valid email required"),
  password: z.string().min(1, "Password is required"),
});

// ── Admin: Offers ─────────────────────────────────────

export const createOfferSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().optional().default(""),
  animal_type: z.enum(ANIMAL_TYPES).default("beef"),
  animal_count: z.coerce.number().int().min(1).default(1),
  share_size: z.enum(SHARE_SIZES).default("1/4"),
  source_info: z.string().optional().default(""),
});

export const updateOfferStatusSchema = z.object({
  stage: z.enum(OFFER_STAGES),
  est_sacrifice_date: z.string().optional().default(""),
  est_raw_pickup: z.string().optional().default(""),
  est_smoked_pickup: z.string().optional().default(""),
  banner_message: z.string().optional().default(""),
  status: z.enum(["draft", "open", "closed", "complete"]).optional(),
});

// ── Admin: Households ──────────────────────────────────

export const createHouseholdSchema = z.object({
  name: z.string().trim().min(1, "Household name is required"),
  contact_info: z.string().optional().default(""),
});

// ── Admin: Expenses ────────────────────────────────────

export const addExpenseSchema = z.object({
  description: z.string().trim().min(1, "Description is required"),
  amount: z.coerce.number().positive("Amount must be a positive number"),
  category: z.string().optional().default("general"),
});

// ── Admin: Payments ────────────────────────────────────

export const addPaymentSchema = z.object({
  household_id: z.string().min(1, "Household is required"),
  amount: z.coerce.number().positive("Amount must be a positive number"),
  method: z.string().optional().default("PayID"),
  payment_date: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

// ── Admin: Cuts ────────────────────────────────────────

export const addCutSchema = z.object({
  name: z.string().trim().min(1, "Cut name is required"),
  category: z
    .enum(["steak", "roast", "mince", "slow_cook", "other", "smoked"])
    .default("other"),
  est_weight_per_slot_kg: z.coerce.number().nonnegative().default(0),
  is_processable: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  portions_per_slot: z.coerce.number().int().min(1).default(1),
});

export const addPrepOptionSchema = z.object({
  cut_id: z.string().min(1, "Cut is required"),
  label: z.string().trim().min(1, "Label is required"),
  extra_cost: z.coerce.number().nonnegative().default(0),
});

// ── Admin: Suggestions ─────────────────────────────────

export const updateSuggestionStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["pending", "noted", "resolved"]),
});

// ── Household: Order ───────────────────────────────────

export const suggestionSchema = z.object({
  message: z.string().trim().min(1, "Can't submit an empty suggestion!"),
});

// ── Helpers ────────────────────────────────────────────

export function parseForm<T extends z.ZodType>(
  schema: T,
  formData: FormData
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const raw = Object.fromEntries(formData.entries());
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }
  return { success: true, data: result.data };
}

export function parseBody<T extends z.ZodType>(
  schema: T,
  body: unknown
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }
  return { success: true, data: result.data };
}

export const OFFER_STAGES = [
  "purchased",
  "est_sacrifice",
  "hanging",
  "butchered",
  "est_arrival",
  "raw_pickup",
  "smoked_pickup",
] as const;

export type OfferStage = (typeof OFFER_STAGES)[number];

export const STAGE_LABELS: Record<OfferStage, string> = {
  purchased: "Sourced & Secured 🐄",
  est_sacrifice: "The Last Moo-ving Day 🌾",
  hanging: "Just Hangin' Around 🥩",
  butchered: "Getting a New Look ✂️",
  est_arrival: "Almost Here 🚚",
  raw_pickup: "Raw Cuts Ready! 📦",
  smoked_pickup: "Smoked & Done! 🔥",
};

export const STAGE_DESCRIPTIONS: Record<OfferStage, string> = {
  purchased: "The animal has been sourced and is living its best life on the paddock.",
  est_sacrifice: "A date has been set for processing. Enjoy the grass while you can, mate.",
  hanging: "The meat is hanging at the butcher. Patience is a virtue.",
  butchered: "The butcher has worked their magic. Cuts are being sorted!",
  est_arrival: "Your order is on its way. Get your freezer ready!",
  raw_pickup: "Fresh cuts are divided and ready for collection.",
  smoked_pickup: "The smoked goods are ready. Perfected by yours truly.",
};

export const ANIMAL_TYPES = ["beef", "lamb", "pork", "other"] as const;
export type AnimalType = (typeof ANIMAL_TYPES)[number];

export const ANIMAL_LABELS: Record<AnimalType, string> = {
  beef: "Beef",
  lamb: "Lamb",
  pork: "Pork",
  other: "Other",
};

export const SHARE_SIZES = ["1/2", "1/4", "1/8"] as const;
export type ShareSize = (typeof SHARE_SIZES)[number];

export function shareSizeDenominator(size: ShareSize): number {
  switch (size) {
    case "1/2": return 2;
    case "1/4": return 4;
    case "1/8": return 8;
  }
}

export interface Household {
  id: string;
  name: string;
  pin_code: string | null;
  invite_token: string;
  contact_info: string | null;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface Offer {
  id: string;
  title: string;
  description: string | null;
  animal_type: AnimalType;
  animal_count: number;
  share_size: ShareSize;
  total_slots: number;
  status: "draft" | "open" | "closed" | "complete";
  stage: OfferStage;
  source_info: string | null;
  banner_message: string | null;
  est_sacrifice_date: string | null;
  est_raw_pickup: string | null;
  est_smoked_pickup: string | null;
  weights_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export interface OfferAnimal {
  id: string;
  offer_id: string;
  animal_number: number;
  hanging_weight_kg: number | null;
  total_take_home_kg: number | null;
}

export interface OfferSlot {
  id: string;
  offer_id: string;
  animal_id: string;
  slot_number: number;
  household_id: string | null;
  is_claimed: boolean;
  claimed_at: string | null;
  household?: Household;
}

export interface OfferCut {
  id: string;
  offer_id: string;
  name: string;
  category: "steak" | "roast" | "mince" | "slow_cook" | "other" | "smoked";
  est_weight_per_slot_kg: number;
  is_processable: boolean;
  display_order: number;
  portions_per_slot: number;
  prep_options?: OfferPrepOption[];
}

export interface OfferPrepOption {
  id: string;
  offer_cut_id: string;
  label: string;
  extra_cost: number;
  display_order: number;
}

export interface OfferSlotCut {
  id: string;
  slot_id: string;
  cut_id: string;
  portion_number: number;
  selected_prep_option_id: string | null;
  actual_weight_kg: number | null;
  notes: string | null;
  cut?: OfferCut;
  prep_option?: OfferPrepOption;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  offer_id: string | null;
  display_order: number;
  created_at: string;
}

export interface Payment {
  id: string;
  household_id: string;
  amount: number;
  method: string;
  payment_date: string;
  notes: string | null;
  offer_id: string | null;
  created_at: string;
  household?: Household;
}

export interface Suggestion {
  id: string;
  household_id: string;
  slot_cut_id: string | null;
  message: string;
  status: "pending" | "noted" | "resolved";
  offer_id: string | null;
  created_at: string;
  household?: Household;
}

export interface SessionData {
  type: "admin" | "household";
  household_id?: string;
  household_name?: string;
}

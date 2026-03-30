export const COW_STAGES = [
  "purchased",
  "est_sacrifice",
  "hanging",
  "butchered",
  "est_arrival",
  "raw_pickup",
  "smoked_pickup",
] as const;

export type CowStage = (typeof COW_STAGES)[number];

export const STAGE_LABELS: Record<CowStage, string> = {
  purchased: "We've Got Beef! 🐄",
  est_sacrifice: "The Last Moo-ving Day 🌾",
  hanging: "Just Hangin' Around 🥩",
  butchered: "Getting a New Look ✂️",
  est_arrival: "Herd It's Almost Here 🚚",
  raw_pickup: "Meat Your Match — Raw Ready! 📦",
  smoked_pickup: "Holy Smokes, It's Done! 🔥",
};

export const STAGE_DESCRIPTIONS: Record<CowStage, string> = {
  purchased: "The steer has been purchased and is living its best life on the paddock.",
  est_sacrifice: "A date has been set for the big day. Enjoy the grass while you can, mate.",
  hanging: "The beef is hanging out (literally) at the butcher. Patience is a virtue.",
  butchered: "The butcher has worked their magic. Cuts are being sorted!",
  est_arrival: "Your beef is on its way. Get your freezer ready!",
  raw_pickup: "Fresh cuts are divided and ready for collection. Come get your beef!",
  smoked_pickup: "The smoked goods are ready. Brisket & ribs, perfected by yours truly.",
};

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

export interface CowStatus {
  id: string;
  stage: CowStage;
  est_sacrifice_date: string | null;
  hanging_weight_kg: number | null;
  total_take_home_kg: number | null;
  est_raw_pickup: string | null;
  est_smoked_pickup: string | null;
  banner_message: string | null;
  updated_at: string;
}

export interface Slot {
  id: string;
  slot_number: number;
  household_id: string | null;
  is_claimed: boolean;
  claimed_at: string | null;
  household?: Household;
}

export interface Cut {
  id: string;
  name: string;
  category: "steak" | "roast" | "mince" | "slow_cook" | "other" | "smoked";
  est_weight_per_slot_kg: number;
  is_processable: boolean;
  display_order: number;
  portions_per_slot: number;
  prep_options?: PrepOption[];
}

export interface PrepOption {
  id: string;
  cut_id: string;
  label: string;
  extra_cost: number;
  display_order: number;
}

export interface SlotCut {
  id: string;
  slot_id: string;
  cut_id: string;
  portion_number: number;
  selected_prep_option_id: string | null;
  actual_weight_kg: number | null;
  notes: string | null;
  cut?: Cut;
  prep_option?: PrepOption;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  created_at: string;
}

export interface Payment {
  id: string;
  household_id: string;
  amount: number;
  method: string;
  payment_date: string;
  notes: string | null;
  created_at: string;
  household?: Household;
}

export interface Suggestion {
  id: string;
  household_id: string;
  slot_cut_id: string | null;
  message: string;
  status: "pending" | "noted" | "resolved";
  created_at: string;
  household?: Household;
}

export interface SessionData {
  type: "admin" | "household";
  household_id?: string;
  household_name?: string;
}

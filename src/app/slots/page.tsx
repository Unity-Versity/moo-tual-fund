import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import type { Slot, CowStatus } from "@/lib/types";
import { SlotGrid } from "./slot-grid";

async function getData() {
  const supabase = await createServerSupabaseClient();

  const [slotsRes, statusRes] = await Promise.all([
    supabase
      .from("slots")
      .select("*, household:households(id, name)")
      .order("slot_number"),
    supabase.from("cow_status").select("*").limit(1).single(),
  ]);

  return {
    slots: (slotsRes.data ?? []) as (Slot & { household: { id: string; name: string } | null })[],
    status: statusRes.data as CowStatus | null,
  };
}

export default async function SlotsPage() {
  const { slots, status } = await getData();
  const session = await getSession();

  const estPerSlot = status?.total_take_home_kg
    ? (status.total_take_home_kg / 8).toFixed(1)
    : status?.hanging_weight_kg
      ? ((status.hanging_weight_kg * 0.65) / 8).toFixed(1)
      : "~50";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Stake Your Steak 🥩</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Each slot is 1/8th of the steer — roughly {estPerSlot}kg of premium beef.
          Claim as many as you like!
        </p>
      </div>

      <SlotGrid slots={slots} session={session} />
    </div>
  );
}

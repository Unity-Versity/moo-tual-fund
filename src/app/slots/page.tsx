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
    slots: (slotsRes.data ?? []) as (Slot & {
      household: { id: string; name: string } | null;
    })[],
    status: statusRes.data as CowStatus | null,
  };
}

export default async function SlotsPage() {
  const { slots } = await getData();
  const session = await getSession();

  const claimed = slots.filter((s) => s.is_claimed).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Slots</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Each slot is an equal share of the steer. Grab as many as you need.
        </p>
      </div>

      <SlotGrid slots={slots} session={session} />

      {claimed >= 8 && (
        <p className="text-center text-sm text-muted-foreground">
          All slots filled! If there&apos;s still demand we can add another
          beast — more shares means the cost per slot drops for everyone.
        </p>
      )}

      {claimed > 0 && claimed < 8 && (
        <p className="text-center text-xs text-muted-foreground">
          If all slots fill and there&apos;s more demand, we can add another
          beast and the per-slot cost drops.
        </p>
      )}
    </div>
  );
}

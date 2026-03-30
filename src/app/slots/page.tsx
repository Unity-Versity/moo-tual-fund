import type { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import type { Slot, CowStatus } from "@/lib/types";
import { SlotGrid } from "./slot-grid";

export const metadata: Metadata = {
  title: "Shares",
  description: "Claim your share of the steer.",
};

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
  const available = slots.length - claimed;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Claim Your Share</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The steer is split into 8 equal shares. Grab one, grab three —
          however much beef you want in your freezer. Each share is 1/8th
          of the whole animal.
        </p>
      </div>

      <SlotGrid slots={slots} session={session} />

      {available === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Fully allocated! If there&apos;s still demand we can look at
          another beast — more shares means a lower cost per share for
          everyone.
        </p>
      )}
    </div>
  );
}

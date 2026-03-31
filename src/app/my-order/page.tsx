import type { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import type { Cut, PrepOption, SlotCut, Slot, Suggestion, Payment, Expense, CowStatus } from "@/lib/types";
import { splitExpenses, calcTotal } from "@/lib/costs";

export const metadata: Metadata = {
  title: "My Order",
  description: "View your cuts, choose prep options, and track your balance.",
};
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, Flame, DollarSign } from "lucide-react";
import { OrderCuts } from "./order-cuts";
import { SuggestionForm } from "./suggestion-form";

async function getData(householdId: string) {
  const supabase = await createServerSupabaseClient();

  const [slotsRes, cutsRes, prepRes, expensesRes, paymentsRes, suggestionsRes, statusRes] =
    await Promise.all([
      supabase
        .from("slots")
        .select("*, slot_cuts:slot_cuts(*, cut:cuts(*), prep_option:prep_options(*))")
        .eq("household_id", householdId)
        .order("slot_number"),
      supabase.from("cuts").select("*").order("display_order"),
      supabase.from("prep_options").select("*").order("display_order"),
      supabase.from("expenses").select("*"),
      supabase.from("payments").select("*").eq("household_id", householdId),
      supabase
        .from("suggestions")
        .select("*")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false }),
      supabase.from("cow_status").select("*").limit(1).single(),
    ]);

  const expenses = (expensesRes.data ?? []) as Expense[];
  const cowStatus = statusRes.data as CowStatus | null;
  const hangingWeight = cowStatus?.hanging_weight_kg
    ? Number(cowStatus.hanging_weight_kg)
    : null;
  const estimateWeight = hangingWeight ?? 150;

  const { fixed, processingRate } = splitExpenses(expenses);
  const { total: totalExpenses } = calcTotal(fixed, processingRate, estimateWeight);

  const totalPaid = (paymentsRes.data ?? []).reduce(
    (sum: number, p: Payment) => sum + Number(p.amount),
    0
  );

  const mySlots = slotsRes.data ?? [];
  const costPerSlot = totalExpenses / 8;
  const baseCost = costPerSlot * mySlots.length;

  // Sum extra_cost from selected prep options across all slots
  const prepSurcharge = mySlots.reduce(
    (sum, slot) =>
      sum +
      (slot.slot_cuts ?? []).reduce(
        (slotSum: number, sc: SlotCut & { prep_option: PrepOption | null }) =>
          slotSum + (sc.prep_option ? Number(sc.prep_option.extra_cost) : 0),
        0
      ),
    0
  );
  const totalOwed = baseCost + prepSurcharge;

  return {
    slots: mySlots as (Slot & {
      slot_cuts: (SlotCut & { cut: Cut; prep_option: PrepOption | null })[];
    })[],
    cuts: (cutsRes.data ?? []) as Cut[],
    prepOptions: (prepRes.data ?? []) as PrepOption[],
    totalExpenses,
    totalPaid,
    totalOwed,
    baseCost,
    prepSurcharge,
    suggestions: (suggestionsRes.data ?? []) as Suggestion[],
  };
}

export default async function MyOrderPage() {
  const session = await getSession();
  if (!session || session.type !== "household") {
    redirect("/login");
  }

  const data = await getData(session.household_id!);
  const { slots, prepOptions, totalPaid, totalOwed, baseCost, prepSurcharge, suggestions } = data;

  if (slots.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <span className="text-5xl">🐄</span>
        <h1 className="text-xl font-bold">No Shares Yet, {session.household_name}!</h1>
        <p className="text-sm text-muted-foreground">
          You haven&apos;t claimed any shares. Head to the{" "}
          <a href="/slots" className="font-medium text-primary underline">Shares page</a>{" "}
          to stake your steak!
        </p>
      </div>
    );
  }

  const rawCuts = slots.flatMap((s) =>
    s.slot_cuts.filter(
      (sc) => sc.cut.category !== "smoked"
    )
  );
  const smokedCuts = slots.flatMap((s) =>
    s.slot_cuts.filter((sc) => sc.cut.category === "smoked")
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">
          Your Order, {session.household_name} 🥩
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You&apos;ve got {slots.length} share{slots.length > 1 ? "s" : ""} — that&apos;s{" "}
          {slots.length}/8 of the steer!
        </p>
      </div>

      {/* Balance Card */}
      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-accent" />
            <div>
              <p className="text-sm text-muted-foreground">Your Balance</p>
              <p className="text-lg font-bold">
                ${(totalOwed - totalPaid).toFixed(2)} AUD
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>Base share: ${baseCost.toFixed(2)}</p>
            {prepSurcharge > 0 && <p>Prep upgrades: +${prepSurcharge.toFixed(2)}</p>}
            <p>Paid: ${totalPaid.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Raw Cuts */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Your Raw Cuts</h2>
        </div>
        <OrderCuts slotCuts={rawCuts} prepOptions={prepOptions} />
      </div>

      <Separator />

      {/* Smoked */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Flame className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-bold">Smoked by the Boss</h2>
          <Badge variant="secondary" className="text-xs">
            Pre-cooked
          </Badge>
        </div>
        {smokedCuts.length > 0 ? (
          <div className="space-y-2">
            {smokedCuts.map((sc) => (
              <Card key={sc.id}>
                <CardContent className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-medium">{sc.cut.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Smoked low &amp; slow — ready to eat 🔥
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground">
                    ~{sc.cut.est_weight_per_slot_kg}kg
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Smoked cuts will appear here once assigned.
          </p>
        )}
      </div>

      <Separator />

      {/* Suggestions */}
      <div>
        <h2 className="mb-3 text-lg font-bold">Cut Preferences 💬</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Every pack gets the same cuts, but let us know if there&apos;s something
          you&apos;d really rather not receive. No promises, but we&apos;ll do our best!
        </p>
        <SuggestionForm suggestions={suggestions} />
      </div>
    </div>
  );
}

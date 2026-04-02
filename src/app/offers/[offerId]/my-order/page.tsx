import type { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import type { OfferCut, OfferPrepOption, OfferSlotCut, OfferSlot, Suggestion, Payment, Expense, Offer } from "@/lib/types";
import { splitExpenses, calcTotal } from "@/lib/costs";

export const metadata: Metadata = {
  title: "My Order",
  description: "Claim your shares, choose prep options, and track your balance.",
};

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DollarSign, ChevronRight } from "lucide-react";
import { OrderCuts } from "./order-cuts";
import { SuggestionForm } from "./suggestion-form";
import { SharePicker } from "./share-picker";
import Link from "next/link";

async function getData(offerId: string, householdId: string) {
  const supabase = await createServerSupabaseClient();

  const [offerRes, slotsRes, allSlotsRes, cutsRes, prepRes, expensesRes, paymentsRes, suggestionsRes] =
    await Promise.all([
      supabase.from("offers").select("*").eq("id", offerId).single(),
      supabase
        .from("offer_slots")
        .select("*, slot_cuts:offer_slot_cuts(*, cut:offer_cuts(*), prep_option:offer_prep_options(*))")
        .eq("offer_id", offerId)
        .eq("household_id", householdId)
        .order("slot_number"),
      supabase.from("offer_slots").select("id, is_claimed").eq("offer_id", offerId).order("slot_number"),
      supabase.from("offer_cuts").select("*").eq("offer_id", offerId).order("display_order"),
      supabase.from("offer_prep_options").select("*, offer_cut_id").order("display_order"),
      supabase.from("expenses").select("*").eq("offer_id", offerId),
      supabase.from("payments").select("*").eq("household_id", householdId).eq("offer_id", offerId),
      supabase
        .from("suggestions")
        .select("*")
        .eq("household_id", householdId)
        .eq("offer_id", offerId)
        .order("created_at", { ascending: false }),
    ]);

  const offer = offerRes.data as Offer | null;
  if (!offer) return null;

  const allSlots = allSlotsRes.data ?? [];
  const totalSlots = allSlots.length;
  const availableSlots = allSlots.filter((s) => !s.is_claimed).length;

  const expenses = (expensesRes.data ?? []) as Expense[];

  // Sum hanging weights from all animals for cost calculation
  const { data: animals } = await supabase
    .from("offer_animals")
    .select("hanging_weight_kg")
    .eq("offer_id", offerId);

  const totalHangingWeight = (animals ?? []).reduce(
    (sum, a) => sum + (a.hanging_weight_kg ? Number(a.hanging_weight_kg) : 0),
    0
  );
  const estimateWeight = totalHangingWeight > 0 ? totalHangingWeight : 150;

  const { fixed, processingRate } = splitExpenses(expenses);
  const { total: totalExpenses } = calcTotal(fixed, processingRate, estimateWeight);

  const totalPaid = (paymentsRes.data ?? []).reduce(
    (sum: number, p: Payment) => sum + Number(p.amount),
    0
  );

  const mySlots = slotsRes.data ?? [];
  const costPerSlot = totalSlots > 0 ? totalExpenses / totalSlots : 0;
  const baseCost = costPerSlot * mySlots.length;

  // Sum extra_cost from selected prep options across all slots
  const prepSurcharge = mySlots.reduce(
    (sum: number, slot: Record<string, unknown>) =>
      sum +
      ((slot.slot_cuts as (OfferSlotCut & { prep_option: OfferPrepOption | null })[]) ?? []).reduce(
        (slotSum: number, sc: OfferSlotCut & { prep_option: OfferPrepOption | null }) =>
          slotSum + (sc.prep_option ? Number(sc.prep_option.extra_cost) : 0),
        0
      ),
    0
  );
  const totalOwed = baseCost + prepSurcharge;

  // Filter prep options to only this offer's cuts
  const offerCutIds = new Set(((cutsRes.data ?? []) as OfferCut[]).map((c) => c.id));
  const filteredPreps = ((prepRes.data ?? []) as OfferPrepOption[]).filter(
    (po) => offerCutIds.has(po.offer_cut_id)
  );

  return {
    offer,
    slots: mySlots as (OfferSlot & {
      slot_cuts: (OfferSlotCut & { cut: OfferCut; prep_option: OfferPrepOption | null })[];
    })[],
    totalSlots,
    availableSlots,
    cuts: (cutsRes.data ?? []) as OfferCut[],
    prepOptions: filteredPreps,
    totalExpenses,
    totalPaid,
    totalOwed,
    baseCost,
    prepSurcharge,
    suggestions: (suggestionsRes.data ?? []) as Suggestion[],
  };
}

export default async function MyOrderPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const session = await getSession();
  if (!session || session.type !== "household") {
    redirect("/login");
  }

  const { offerId } = await params;
  const data = await getData(offerId, session.household_id!);
  if (!data) notFound();

  const {
    offer, slots, totalSlots, availableSlots, prepOptions,
    totalPaid, totalOwed, baseCost, prepSurcharge, suggestions,
  } = data;

  const hasShares = slots.length > 0;

  const allSlotCuts = slots.flatMap((s) => s.slot_cuts);

  const isEstimate = !offer.weights_confirmed;
  const estLabel = isEstimate ? " (est.)" : "";

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/offers" className="hover:text-foreground">Offers</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/offers/${offer.id}`} className="hover:text-foreground">{offer.title}</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">My Order</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold">
          {hasShares
            ? `Your Order, ${session.household_name} 🥩`
            : `Welcome, ${session.household_name}! 🐄`}
        </h1>
        {hasShares && (
          <p className="mt-1 text-sm text-muted-foreground">
            You&apos;ve got {slots.length} {offer.share_size} share{slots.length > 1 ? "s" : ""} of {offer.title}
          </p>
        )}
      </div>

      {/* Share Picker */}
      <SharePicker
        offerId={offer.id}
        currentShares={slots.length}
        totalSlots={totalSlots}
        availableSlots={availableSlots}
        shareSize={offer.share_size}
      />

      {!hasShares ? (
        <p className="text-center text-sm text-muted-foreground">
          Pick how many shares you want above, then hit claim to see your order.
        </p>
      ) : (
        <>
          {/* Balance Card */}
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-sm text-muted-foreground">Your Balance{estLabel}</p>
                  <p className="text-lg font-bold">
                    ${(totalOwed - totalPaid).toFixed(2)} AUD
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>Base share: ${baseCost.toFixed(2)}{estLabel}</p>
                {prepSurcharge > 0 && <p>Prep upgrades: +${prepSurcharge.toFixed(2)}</p>}
                <p>Paid: ${totalPaid.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Two-Zone Cut Display */}
          <OrderCuts
            offerId={offer.id}
            slotCuts={allSlotCuts}
            prepOptions={prepOptions}
            weightsConfirmed={offer.weights_confirmed}
          />

          <Separator />

          {/* Suggestions */}
          <div>
            <h2 className="mb-3 text-lg font-bold">Cut Preferences 💬</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Got a cut you&apos;d rather skip? Let us know — no guarantees, but we&apos;ll try.
            </p>
            <SuggestionForm offerId={offer.id} suggestions={suggestions} />
          </div>
        </>
      )}
    </div>
  );
}

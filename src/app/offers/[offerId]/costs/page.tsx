import type { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import type { Offer, OfferAnimal, Expense } from "@/lib/types";
import { splitExpenses, calcTotal } from "@/lib/costs";

export const metadata: Metadata = {
  title: "Costs",
  description: "See how the money breaks down across all shares.",
};

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, Wallet, ChevronRight } from "lucide-react";
import { CostCalculator } from "@/components/cost-calculator";
import Link from "next/link";

async function getData(offerId: string) {
  const supabase = await createServerSupabaseClient();

  const [offerRes, animalsRes, expensesRes] = await Promise.all([
    supabase.from("offers").select("*").eq("id", offerId).single(),
    supabase.from("offer_animals").select("*").eq("offer_id", offerId),
    supabase.from("expenses").select("*").eq("offer_id", offerId).order("created_at"),
  ]);

  return {
    offer: offerRes.data as Offer | null,
    animals: (animalsRes.data ?? []) as OfferAnimal[],
    expenses: (expensesRes.data ?? []) as Expense[],
  };
}

export default async function CostsPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { offerId } = await params;
  const { offer, animals, expenses } = await getData(offerId);

  if (!offer) notFound();

  const totalHangingWeight = animals.reduce(
    (sum, a) => sum + (a.hanging_weight_kg ? Number(a.hanging_weight_kg) : 0),
    0
  );
  const hangingWeight = totalHangingWeight > 0 ? totalHangingWeight : null;
  const estimateWeight = hangingWeight ?? 150;

  const { fixed, processingRate } = splitExpenses(expenses);
  const { total } = calcTotal(fixed, processingRate, estimateWeight);
  const costPerSlot = offer.total_slots > 0 ? total / offer.total_slots : 0;

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
        <span className="text-foreground">Costs</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Costs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cost breakdown for {offer.title}.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center p-4 text-center">
            <Receipt className="mb-1 h-5 w-5 text-primary" />
            <p className="text-xl font-bold">${total.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">
              Total{estLabel}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-4 text-center">
            <Wallet className="mb-1 h-5 w-5 text-accent" />
            <p className="text-xl font-bold">${costPerSlot.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">
              Per {offer.share_size} Share{estLabel}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Calculator */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <CostCalculator
            expenses={expenses}
            hangingWeight={hangingWeight}
            totalSlots={offer.total_slots}
            shareSize={offer.share_size}
            weightsConfirmed={offer.weights_confirmed}
          />
        </CardContent>
      </Card>

      {/* Payment */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-primary">How to Pay</p>
          <p className="mt-1 text-sm text-muted-foreground">
            PayID transfer. Include your name in the description.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

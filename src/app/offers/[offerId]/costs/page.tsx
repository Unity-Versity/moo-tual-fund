import type { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import type { Offer, OfferAnimal, Expense } from "@/lib/types";

export const metadata: Metadata = {
  title: "Costs",
  description: "See how the money breaks down across all shares.",
};

import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { CostCalculator } from "@/components/cost-calculator";
import Link from "next/link";

async function getData(offerId: string) {
  const supabase = await createServerSupabaseClient();

  const [offerRes, animalsRes, expensesRes] = await Promise.all([
    supabase.from("offers").select("*").eq("id", offerId).single(),
    supabase.from("offer_animals").select("*").eq("offer_id", offerId),
    supabase.from("expenses").select("*").eq("offer_id", offerId).order("display_order"),
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

      {/* Interactive Calculator */}
      <Card>
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

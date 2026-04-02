import type { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import type { Offer, OfferSlot } from "@/lib/types";
import { ANIMAL_LABELS, STAGE_LABELS } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Offers",
  description: "Browse available group buys.",
};

async function getData() {
  const supabase = await createServerSupabaseClient();

  const { data: offers } = await supabase
    .from("offers")
    .select("*")
    .neq("status", "draft")
    .order("created_at", { ascending: false });

  const { data: slots } = await supabase
    .from("offer_slots")
    .select("id, offer_id, is_claimed");

  return {
    offers: (offers ?? []) as Offer[],
    slots: (slots ?? []) as Pick<OfferSlot, "id" | "offer_id" | "is_claimed">[],
  };
}

const STATUS_STYLES: Record<string, string> = {
  open: "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400",
  closed: "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-400",
  complete: "border-muted bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  closed: "Closed",
  complete: "Complete",
};

export default async function OffersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const { offers, slots } = await getData();

  if (offers.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Group Buys</h1>
        <p className="text-sm text-muted-foreground">
          No offers available right now. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Group Buys</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse available offers and claim your share.
        </p>
      </div>

      <div className="space-y-3">
        {offers.map((offer) => {
          const offerSlots = slots.filter((s) => s.offer_id === offer.id);
          const claimed = offerSlots.filter((s) => s.is_claimed).length;
          const total = offerSlots.length;
          const available = total - claimed;

          return (
            <Link key={offer.id} href={`/offers/${offer.id}`}>
              <Card className="transition-colors hover:border-primary/40">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-bold">{offer.title}</h2>
                        <Badge
                          variant="outline"
                          className={`text-xs ${STATUS_STYLES[offer.status] ?? ""}`}
                        >
                          {STATUS_LABELS[offer.status] ?? offer.status}
                        </Badge>
                      </div>

                      {offer.description && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {offer.description}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{ANIMAL_LABELS[offer.animal_type]}</span>
                        <span>{offer.animal_count} animal{offer.animal_count > 1 ? "s" : ""}</span>
                        <span>{offer.share_size} shares</span>
                        <span>
                          {available > 0
                            ? `${available} share${available > 1 ? "s" : ""} available`
                            : "Fully claimed"}
                        </span>
                      </div>

                      <p className="mt-1.5 text-xs text-primary font-medium">
                        {STAGE_LABELS[offer.stage]}
                      </p>
                    </div>

                    <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

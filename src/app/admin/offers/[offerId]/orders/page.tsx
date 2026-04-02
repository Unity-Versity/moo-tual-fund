"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { OfferCut, OfferPrepOption } from "@/lib/types";

const CATEGORY_ORDER = ["steak", "roast", "slow_cook", "mince", "other", "smoked"];
const CATEGORY_LABELS: Record<string, string> = {
  steak: "Steaks",
  roast: "Roasts",
  slow_cook: "Slow Cook",
  mince: "Mince & Ground",
  other: "Other Cuts",
  smoked: "Smoked",
};

interface SlotData {
  id: string;
  slot_number: number;
  household: { name: string } | null;
  slot_cuts: {
    id: string;
    cut: OfferCut;
    prep_option: OfferPrepOption | null;
    portion_number: number;
  }[];
}

export default function AdminOfferOrdersPage() {
  const params = useParams();
  const offerId = params.offerId as string;

  const [slots, setSlots] = useState<SlotData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("offer_slots")
      .select("id, slot_number, household:households(name), slot_cuts:offer_slot_cuts(id, portion_number, cut:offer_cuts(*), prep_option:offer_prep_options(*))")
      .eq("offer_id", offerId)
      .eq("is_claimed", true)
      .order("slot_number")
      .then(({ data }) => {
        if (data) setSlots(data as unknown as SlotData[]);
        setLoading(false);
      });
  }, [offerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Group by household
  const grouped = new Map<string, { name: string; slots: SlotData[] }>();
  for (const slot of slots) {
    const name = slot.household?.name ?? "Unknown";
    const existing = grouped.get(name);
    if (existing) {
      existing.slots.push(slot);
    } else {
      grouped.set(name, { name, slots: [slot] });
    }
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/admin/offers" className="hover:text-foreground">Offers</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/admin/offers/${offerId}`} className="hover:text-foreground">Manage</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Orders</span>
      </div>

      <h2 className="text-lg font-bold">All Orders</h2>

      {grouped.size === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No orders yet. The herd hasn&apos;t claimed any shares!
        </p>
      ) : (
        Array.from(grouped.values()).map(({ name, slots: householdSlots }) => {
          const allCuts = householdSlots.flatMap((s) => s.slot_cuts);
          const processable = allCuts.filter((sc) => sc.cut.is_processable);
          const selected = processable.filter((sc) => sc.prep_option);

          return (
            <Card key={name}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{name}</p>
                    <Badge variant="outline" className="text-xs">
                      {householdSlots.length} share{householdSlots.length > 1 ? "s" : ""}
                    </Badge>
                  </div>
                  {processable.length > 0 && (
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        selected.length === processable.length
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-yellow-200 bg-yellow-50 text-yellow-700"
                      }`}
                    >
                      {selected.length}/{processable.length} selected
                    </Badge>
                  )}
                </div>

                {CATEGORY_ORDER.map((cat) => {
                  const catCuts = allCuts.filter((sc) => sc.cut.category === cat);
                  if (catCuts.length === 0) return null;
                  return (
                    <div key={cat}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        {CATEGORY_LABELS[cat]}
                      </p>
                      <div className="space-y-0.5">
                        {catCuts.map((sc) => (
                          <div key={sc.id} className="flex items-center gap-2 text-sm">
                            {sc.cut.is_processable ? (
                              sc.prep_option ? (
                                <span className="text-green-600 dark:text-green-400">✓</span>
                              ) : (
                                <span className="text-amber-500">−</span>
                              )
                            ) : (
                              <span className="text-muted-foreground/50">·</span>
                            )}
                            <span>{sc.cut.name}</span>
                            {sc.prep_option && (
                              <Badge variant="secondary" className="text-xs">
                                {sc.prep_option.label}
                              </Badge>
                            )}
                            {sc.cut.portions_per_slot > 1 && (
                              <span className="text-xs text-muted-foreground">
                                #{sc.portion_number}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

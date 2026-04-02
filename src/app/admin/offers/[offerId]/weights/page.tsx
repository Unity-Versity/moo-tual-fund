"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateCutTotalWeightAll } from "../../../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const CATEGORY_ORDER = ["steak", "roast", "slow_cook", "mince", "other", "smoked"];
const CATEGORY_LABELS: Record<string, string> = {
  steak: "Steaks",
  roast: "Roasts",
  slow_cook: "Slow Cook",
  mince: "Mince & Ground",
  other: "Other Cuts",
  smoked: "Smoked",
};

interface CutWithWeight {
  id: string;
  name: string;
  category: string;
  portions_per_slot: number;
  total_weight: number | null;
  slot_count: number;
  total_slots: number;
}

export default function AdminOfferWeightsPage() {
  const params = useParams();
  const offerId = params.offerId as string;

  const [cuts, setCuts] = useState<CutWithWeight[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const [cutsRes, slotsRes, slotCutsRes, offerRes] = await Promise.all([
        supabase.from("offer_cuts").select("id, name, category, portions_per_slot, display_order").eq("offer_id", offerId).order("display_order"),
        supabase.from("offer_slots").select("id, is_claimed").eq("offer_id", offerId).eq("is_claimed", true),
        supabase.from("offer_slot_cuts").select("id, cut_id, actual_weight_kg, slot_id"),
        supabase.from("offers").select("total_slots").eq("id", offerId).single(),
      ]);

      const cutsData = cutsRes.data ?? [];
      const slotsData = slotsRes.data ?? [];
      const slotCutsData = slotCutsRes.data ?? [];
      const totalSlots = offerRes.data?.total_slots ?? 0;

      const claimedSlotIds = new Set(slotsData.map((s) => s.id));

      const combined: CutWithWeight[] = cutsData.map((cut) => {
        const cutSlotCuts = slotCutsData.filter(
          (sc) => sc.cut_id === cut.id && claimedSlotIds.has(sc.slot_id)
        );
        // Reconstruct total weight: per-slot-cut × total_slots × portions_per_slot
        const perSlotCutWeight = cutSlotCuts.length > 0 && cutSlotCuts[0].actual_weight_kg != null
          ? Number(cutSlotCuts[0].actual_weight_kg)
          : null;
        const totalWeight = perSlotCutWeight != null
          ? perSlotCutWeight * totalSlots * cut.portions_per_slot
          : null;

        return {
          id: cut.id,
          name: cut.name,
          category: cut.category,
          portions_per_slot: cut.portions_per_slot,
          total_weight: totalWeight,
          slot_count: cutSlotCuts.length,
          total_slots: totalSlots,
        };
      });

      setCuts(combined);
      setLoading(false);
    }
    load();
  }, [offerId]);

  function handleWeightChange(cutId: string, value: string) {
    const totalWeight = value === "" ? null : Number(value);
    if (value !== "" && isNaN(totalWeight!)) return;

    startTransition(async () => {
      const result = await updateCutTotalWeightAll(offerId, cutId, totalWeight);
      if (result.error) {
        toast.error(result.error);
      } else {
        setCuts((prev) =>
          prev.map((c) =>
            c.id === cutId ? { ...c, total_weight: totalWeight } : c
          )
        );
        setSavedKeys((prev) => new Set(prev).add(cutId));
        setTimeout(() => {
          setSavedKeys((prev) => {
            const next = new Set(prev);
            next.delete(cutId);
            return next;
          });
        }, 2000);
      }
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat] ?? cat,
    items: cuts.filter((c) => c.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/admin/offers" className="hover:text-foreground">Offers</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/admin/offers/${offerId}`} className="hover:text-foreground">Manage</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Weights</span>
      </div>

      <div>
        <h2 className="text-lg font-bold">Weights by Cut</h2>
        <p className="text-sm text-muted-foreground">
          Enter the <strong>total</strong> weight for each cut. Split evenly across all claimed slots.
        </p>
      </div>

      {grouped.map((group) => (
        <div key={group.category} className="space-y-1.5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {group.label}
          </h4>
          {group.items.map((cut) => {
            const isSaved = savedKeys.has(cut.id);
            const perSlot = cut.total_weight != null && cut.total_slots > 0
              ? (cut.total_weight / cut.total_slots).toFixed(2)
              : null;

            return (
              <Card key={cut.id}>
                <CardContent className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{cut.name}</p>
                    {perSlot && (
                      <p className="text-xs text-muted-foreground">
                        {perSlot}kg/share &bull; {cut.total_slots} shares
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isSaved && (
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    )}
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="—"
                      defaultValue={cut.total_weight ?? ""}
                      onBlur={(e) => handleWeightChange(cut.id, e.target.value)}
                      className="w-24 text-right text-sm"
                      disabled={isPending}
                    />
                    <span className="text-xs text-muted-foreground">kg</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}

      {/* ── Totals ── */}
      {cuts.length > 0 && (() => {
        const filledCuts = cuts.filter((c) => c.total_weight != null);
        const totalWeight = filledCuts.reduce((s, c) => s + (c.total_weight ?? 0), 0);
        const slotCount = cuts[0]?.total_slots ?? 0;
        const totalPerSlot = slotCount > 0 ? totalWeight / slotCount : 0;

        return (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Total Entered</p>
                  <p className="text-xs text-muted-foreground">
                    {filledCuts.length} of {cuts.length} cuts weighed
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold tabular-nums">{totalWeight.toFixed(2)} kg</p>
                  {slotCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {totalPerSlot.toFixed(2)} kg/slot &bull; {slotCount} slots
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {cuts.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No cuts defined yet. Add cuts first.
        </p>
      )}

      {isPending && (
        <p className="text-center text-xs text-muted-foreground animate-pulse">
          Saving...
        </p>
      )}
    </div>
  );
}

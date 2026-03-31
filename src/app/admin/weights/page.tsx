"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateCutTotalWeight } from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";

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
  slot_cut_count: number;
  claimed_slots: number;
  total_weight: number | null; // sum of all slot_cuts actual_weight_kg
}

export default function WeightsPage() {
  const [cuts, setCuts] = useState<CutWithWeight[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [savedCuts, setSavedCuts] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Get all cuts with their slot_cuts from claimed slots
      const { data: cutsData } = await supabase
        .from("cuts")
        .select("id, name, category, portions_per_slot, display_order")
        .order("display_order");

      const { data: slotCutsData } = await supabase
        .from("slot_cuts")
        .select("id, cut_id, actual_weight_kg, slot:slots!inner(is_claimed)")
        .eq("slot.is_claimed", true);

      const { count: claimedCount } = await supabase
        .from("slots")
        .select("id", { count: "exact", head: true })
        .eq("is_claimed", true);

      if (!cutsData) {
        setLoading(false);
        return;
      }

      const result: CutWithWeight[] = cutsData.map((cut) => {
        const cutSlotCuts = (slotCutsData ?? []).filter(
          (sc) => sc.cut_id === cut.id
        );
        const totalWeight = cutSlotCuts.every((sc) => sc.actual_weight_kg == null)
          ? null
          : cutSlotCuts.reduce(
              (sum, sc) => sum + (Number(sc.actual_weight_kg) || 0),
              0
            );

        return {
          id: cut.id,
          name: cut.name,
          category: cut.category,
          portions_per_slot: cut.portions_per_slot,
          slot_cut_count: cutSlotCuts.length,
          claimed_slots: claimedCount ?? 0,
          total_weight: totalWeight,
        };
      });

      setCuts(result);
      setLoading(false);
    }
    load();
  }, []);

  function handleWeightChange(cutId: string, value: string) {
    const totalWeight = value === "" ? null : Number(value);
    if (value !== "" && isNaN(totalWeight!)) return;

    startTransition(async () => {
      const result = await updateCutTotalWeight(cutId, totalWeight);
      if (result.error) {
        toast.error(result.error);
      } else {
        // Update local state
        setCuts((prev) =>
          prev.map((c) =>
            c.id === cutId ? { ...c, total_weight: totalWeight } : c
          )
        );
        setSavedCuts((prev) => new Set(prev).add(cutId));
        setTimeout(() => {
          setSavedCuts((prev) => {
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

  if (cuts.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No cuts defined yet. Add cuts first, then come back to enter weights.
      </p>
    );
  }

  // Group by category
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat] ?? cat,
    items: cuts.filter((c) => c.category === cat),
  })).filter((g) => g.items.length > 0);

  const claimedSlots = cuts[0]?.claimed_slots ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold">Total Weights by Cut</h2>
        <p className="text-sm text-muted-foreground">
          Enter the <strong>total</strong> weight for each cut. It&apos;ll be split
          evenly across {claimedSlots} claimed slot{claimedSlots !== 1 ? "s" : ""}.
        </p>
      </div>

      {grouped.map((group) => (
        <div key={group.category} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {group.label}
          </h3>
          {group.items.map((cut) => {
            const perSlot =
              cut.total_weight != null && cut.claimed_slots > 0
                ? cut.total_weight / cut.claimed_slots
                : null;
            const isSaved = savedCuts.has(cut.id);

            return (
              <Card key={cut.id}>
                <CardContent className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{cut.name}</p>
                    {perSlot != null && (
                      <p className="text-xs text-muted-foreground">
                        = {perSlot.toFixed(2)}kg per share
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

      {isPending && (
        <p className="text-center text-xs text-muted-foreground animate-pulse">
          Saving...
        </p>
      )}
    </div>
  );
}

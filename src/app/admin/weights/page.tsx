"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateActualWeight } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SlotWithCuts {
  id: string;
  slot_number: number;
  household: { name: string } | null;
  slot_cuts: {
    id: string;
    portion_number: number;
    actual_weight_kg: number | null;
    cut: { name: string; est_weight_per_slot_kg: number; category: string };
  }[];
}

export default function WeightsPage() {
  const [slots, setSlots] = useState<SlotWithCuts[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("slots")
        .select(
          "id, slot_number, household:households(name), slot_cuts:slot_cuts(id, portion_number, actual_weight_kg, cut:cuts(name, est_weight_per_slot_kg, category))"
        )
        .eq("is_claimed", true)
        .order("slot_number");
      setSlots((data as unknown as SlotWithCuts[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  function handleWeightChange(slotCutId: string, value: string) {
    const weight = value === "" ? null : Number(value);
    if (value !== "" && isNaN(weight!)) return;

    startTransition(async () => {
      const result = await updateActualWeight(slotCutId, weight);
      if (result.error) {
        toast.error(result.error);
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

  if (slots.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No claimed slots yet. Weights can be entered once households claim their slots.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold">Actual Weights</h2>
        <p className="text-sm text-muted-foreground">
          Enter the real weight for each cut after butchering. This updates each household&apos;s order view.
        </p>
      </div>

      {slots.map((slot) => (
        <Card key={slot.id}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              Slot {slot.slot_number}
              {slot.household && (
                <Badge variant="secondary" className="text-xs">
                  {slot.household.name}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {slot.slot_cuts
              .sort((a, b) => {
                const catOrder = ["steak", "roast", "slow_cook", "mince", "other", "smoked"];
                const aCat = catOrder.indexOf(a.cut.category);
                const bCat = catOrder.indexOf(b.cut.category);
                if (aCat !== bCat) return aCat - bCat;
                if (a.cut.name !== b.cut.name) return a.cut.name.localeCompare(b.cut.name);
                return a.portion_number - b.portion_number;
              })
              .map((sc) => (
                <div
                  key={sc.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {sc.cut.name}
                      {sc.portion_number > 1 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          #{sc.portion_number}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Est: {sc.cut.est_weight_per_slot_kg}kg
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="—"
                      defaultValue={sc.actual_weight_kg ?? ""}
                      onBlur={(e) => handleWeightChange(sc.id, e.target.value)}
                      className="w-20 text-right text-sm"
                    />
                    <span className="text-xs text-muted-foreground">kg</span>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      ))}

      {isPending && (
        <p className="text-center text-xs text-muted-foreground animate-pulse">
          Saving...
        </p>
      )}
    </div>
  );
}

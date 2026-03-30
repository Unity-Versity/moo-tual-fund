"use client";

import { useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updatePrepOption } from "./actions";
import type { SlotCut, Cut, PrepOption } from "@/lib/types";
import { toast } from "sonner";

const CATEGORY_LABELS: Record<string, string> = {
  steak: "🥩 Steak",
  roast: "🍖 Roast",
  mince: "🫕 Mince",
  slow_cook: "🍲 Slow Cook",
  other: "🦴 Other",
  smoked: "🔥 Smoked",
};

export function OrderCuts({
  slotCuts,
  prepOptions,
}: {
  slotCuts: (SlotCut & { cut: Cut; prep_option: PrepOption | null })[];
  prepOptions: PrepOption[];
}) {
  const [isPending, startTransition] = useTransition();

  const grouped = slotCuts.reduce(
    (acc, sc) => {
      const cat = sc.cut.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(sc);
      return acc;
    },
    {} as Record<string, typeof slotCuts>
  );

  const categoryOrder = ["steak", "roast", "slow_cook", "mince", "other"];

  function handlePrepChange(slotCutId: string, value: string | null) {
    startTransition(async () => {
      const result = await updatePrepOption(
        slotCutId,
        value === "none" ? null : value
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Updated! 🐄");
      }
    });
  }

  return (
    <div className="space-y-4">
      {categoryOrder.map((cat) => {
        const items = grouped[cat];
        if (!items || items.length === 0) return null;

        return (
          <div key={cat}>
            <p className="mb-2 text-sm font-semibold text-muted-foreground">
              {CATEGORY_LABELS[cat] ?? cat}
            </p>
            <div className="space-y-2">
              {items.map((sc) => {
                const cutPrepOptions = prepOptions.filter(
                  (po) => po.cut_id === sc.cut_id
                );
                const isProcessable = sc.cut.is_processable && cutPrepOptions.length > 0;

                return (
                  <Card key={sc.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{sc.cut.name}</p>
                            {sc.cut.portions_per_slot > 1 && (
                              <Badge variant="outline" className="text-xs">
                                Portion {sc.portion_number}/{sc.cut.portions_per_slot}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            ~{(sc.actual_weight_kg ?? Number(sc.cut.est_weight_per_slot_kg) / Math.max(sc.cut.portions_per_slot, 1)).toFixed(1)}kg
                          </p>
                        </div>

                        {isProcessable ? (
                          <Select
                            defaultValue={sc.selected_prep_option_id ?? undefined}
                            onValueChange={(val) => handlePrepChange(sc.id, val)}
                            disabled={isPending}
                          >
                            <SelectTrigger className="h-8 w-full sm:w-[160px] text-xs" aria-label={`Prep option for ${sc.cut.name}`}>
                              <SelectValue placeholder="Choose prep..." />
                            </SelectTrigger>
                            <SelectContent>
                              {cutPrepOptions.map((po) => (
                                <SelectItem key={po.id} value={po.id} className="text-xs">
                                  {po.label}
                                  {Number(po.extra_cost) > 0 && ` (+$${po.extra_cost})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Raw
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

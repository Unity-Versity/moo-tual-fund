"use client";

import { useTransition, useOptimistic } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { updatePrepOption } from "./actions";
import type { SlotCut, Cut, PrepOption } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  steak: "Steaks",
  roast: "Roasts",
  slow_cook: "Slow Cook",
  mince: "Mince & Ground",
  other: "Other Cuts",
};

const CATEGORY_ORDER = ["steak", "roast", "slow_cook", "mince", "other"];

export function OrderCuts({
  slotCuts,
  prepOptions,
}: {
  slotCuts: (SlotCut & { cut: Cut; prep_option: PrepOption | null })[];
  prepOptions: PrepOption[];
}) {
  const processable = slotCuts.filter((sc) => {
    const cutPrepOptions = prepOptions.filter((po) => po.cut_id === sc.cut_id);
    return sc.cut.is_processable && cutPrepOptions.length > 0;
  });

  // Group by category
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat] ?? cat,
    items: processable.filter((sc) => sc.cut.category === cat),
  })).filter((g) => g.items.length > 0);

  if (processable.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No prep choices available yet.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {grouped.map((group) => (
        <div key={group.category} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {group.label}
          </h3>
          {group.items.map((sc) => (
            <CutCard
              key={sc.id}
              slotCut={sc}
              prepOptions={prepOptions.filter((po) => po.cut_id === sc.cut_id)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function CutCard({
  slotCut,
  prepOptions,
}: {
  slotCut: SlotCut & { cut: Cut; prep_option: PrepOption | null };
  prepOptions: PrepOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [optimisticId, setOptimisticId] = useOptimistic(
    slotCut.selected_prep_option_id
  );

  function handleSelect(prepOptionId: string) {
    if (prepOptionId === optimisticId) return;
    setOptimisticId(prepOptionId);
    startTransition(async () => {
      const result = await updatePrepOption(slotCut.id, prepOptionId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Updated! 🐄");
      }
    });
  }

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{slotCut.cut.name}</p>
          {slotCut.cut.portions_per_slot > 1 && (
            <Badge variant="outline" className="text-xs">
              Portion {slotCut.portion_number}/{slotCut.cut.portions_per_slot}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {prepOptions.map((po) => {
            const isSelected = optimisticId === po.id;
            return (
              <button
                key={po.id}
                type="button"
                disabled={isPending}
                onClick={() => handleSelect(po.id)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  isSelected
                    ? "border-green-600 bg-green-50 text-green-700 dark:border-green-500 dark:bg-green-950 dark:text-green-400"
                    : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {isSelected && <Check className="size-3" />}
                {po.label}
                {Number(po.extra_cost) > 0 && ` (+$${po.extra_cost})`}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

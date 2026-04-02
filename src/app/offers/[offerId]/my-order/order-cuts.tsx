"use client";

import { useTransition, useOptimistic } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { updatePrepOption } from "./actions";
import type { OfferSlotCut, OfferCut, OfferPrepOption } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  steak: "Steaks",
  roast: "Roasts",
  slow_cook: "Slow Cook",
  mince: "Mince & Ground",
  other: "Other Cuts",
  smoked: "Smoked",
};

const CATEGORY_ORDER = ["steak", "roast", "slow_cook", "mince", "other", "smoked"];

type SlotCutWithJoins = OfferSlotCut & { cut: OfferCut; prep_option: OfferPrepOption | null };

function formatWeight(kg: number | null, isEstimate: boolean): string {
  if (kg == null || kg === 0) return "";
  const formatted = kg >= 1 ? `${kg.toFixed(1)}kg` : `${Math.round(kg * 1000)}g`;
  return isEstimate ? `${formatted} est.` : formatted;
}

function getPrepLabel(label: string): string {
  if (label.toLowerCase() === "raw" || label.toLowerCase().startsWith("raw ")) {
    return `[Raw]`;
  }
  return `Ready to Eat [${label}]`;
}

export function OrderCuts({
  offerId,
  slotCuts,
  prepOptions,
  weightsConfirmed,
}: {
  offerId: string;
  slotCuts: SlotCutWithJoins[];
  prepOptions: OfferPrepOption[];
  weightsConfirmed: boolean;
}) {
  const isEstimate = !weightsConfirmed;

  // Split into two zones
  const noPrepCuts = slotCuts.filter((sc) => {
    const cutPreps = prepOptions.filter((po) => po.offer_cut_id === sc.cut_id);
    return !sc.cut.is_processable || cutPreps.length === 0;
  });

  const prepCuts = slotCuts.filter((sc) => {
    const cutPreps = prepOptions.filter((po) => po.offer_cut_id === sc.cut_id);
    return sc.cut.is_processable && cutPreps.length > 0;
  });

  // Group by category
  function groupByCategory(items: SlotCutWithJoins[]) {
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat] ?? cat,
      items: items.filter((sc) => sc.cut.category === cat),
    })).filter((g) => g.items.length > 0);
  }

  const noPrepGrouped = groupByCategory(noPrepCuts);
  const prepGrouped = groupByCategory(prepCuts);

  // Deduplicate cuts for display (show each unique cut once, not per-slot)
  function deduplicateCuts(items: SlotCutWithJoins[]): SlotCutWithJoins[] {
    const seen = new Set<string>();
    return items.filter((sc) => {
      const key = `${sc.cut_id}-${sc.portion_number}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  return (
    <div className="space-y-6">
      {/* Zone 1: Standard Cuts (no prep options) */}
      {noPrepGrouped.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
              Your Cuts
            </h3>
            <p className="text-xs text-muted-foreground">
              These come as-is with your share.
            </p>
          </div>
          {noPrepGrouped.map((group) => (
            <div key={group.category} className="space-y-1.5">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {group.label}
              </h4>
              {deduplicateCuts(group.items).map((sc) => {
                const weight = formatWeight(
                  sc.actual_weight_kg ?? sc.cut.est_weight_per_slot_kg,
                  sc.actual_weight_kg == null && isEstimate
                );
                return (
                  <Card key={sc.id}>
                    <CardContent className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{sc.cut.name}</p>
                        {sc.cut.portions_per_slot > 1 && (
                          <Badge variant="outline" className="text-xs">
                            Portion {sc.portion_number}/{sc.cut.portions_per_slot}
                          </Badge>
                        )}
                      </div>
                      {weight && (
                        <span className="text-xs text-muted-foreground">{weight}</span>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Zone 2: Prepared Cuts (with prep options) */}
      {prepGrouped.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
              Prepared Cuts
            </h3>
            <p className="text-xs text-muted-foreground">
              Choose how you want each cut prepared. Everything is pre-cooked and ready to eat unless you select Raw.
            </p>
          </div>
          {prepGrouped.map((group) => (
            <div key={group.category} className="space-y-1.5">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {group.label}
              </h4>
              {group.items.map((sc) => (
                <PrepCutCard
                  key={sc.id}
                  offerId={offerId}
                  slotCut={sc}
                  prepOptions={prepOptions.filter((po) => po.offer_cut_id === sc.cut_id)}
                  isEstimate={sc.actual_weight_kg == null && isEstimate}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {noPrepGrouped.length === 0 && prepGrouped.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No cuts available yet. Check back soon.
        </p>
      )}
    </div>
  );
}

function PrepCutCard({
  offerId,
  slotCut,
  prepOptions,
  isEstimate,
}: {
  offerId: string;
  slotCut: SlotCutWithJoins;
  prepOptions: OfferPrepOption[];
  isEstimate: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [optimisticId, setOptimisticId] = useOptimistic(
    slotCut.selected_prep_option_id
  );

  const weight = formatWeight(
    slotCut.actual_weight_kg ?? slotCut.cut.est_weight_per_slot_kg,
    isEstimate
  );

  function handleSelect(prepOptionId: string) {
    if (prepOptionId === optimisticId) return;
    setOptimisticId(prepOptionId);
    startTransition(async () => {
      const result = await updatePrepOption(offerId, slotCut.id, prepOptionId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Updated!");
      }
    });
  }

  const selectedPrep = prepOptions.find((po) => po.id === optimisticId);

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{slotCut.cut.name}</p>
            {slotCut.cut.portions_per_slot > 1 && (
              <Badge variant="outline" className="text-xs">
                Portion {slotCut.portion_number}/{slotCut.cut.portions_per_slot}
              </Badge>
            )}
          </div>
          {weight && (
            <span className="text-xs text-muted-foreground">{weight}</span>
          )}
        </div>

        {/* Selected prep label */}
        {selectedPrep && (
          <p className="text-xs font-medium text-primary">
            {getPrepLabel(selectedPrep.label)}
          </p>
        )}

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
                {getPrepLabel(po.label)}
                {Number(po.extra_cost) > 0 && ` (+$${po.extra_cost})`}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

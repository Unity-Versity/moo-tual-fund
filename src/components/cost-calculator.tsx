"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Weight, DollarSign, Tag, Lock } from "lucide-react";
import type { Expense } from "@/lib/types";
import { splitExpenses, calcTotal } from "@/lib/costs";

const MIN_WEIGHT = 150;
const MAX_WEIGHT = 170;

export function CostCalculator({
  expenses,
  hangingWeight,
  totalSlots,
  shareSize,
  weightsConfirmed,
}: {
  expenses: Expense[];
  hangingWeight: number | null;
  totalSlots: number;
  shareSize: string;
  weightsConfirmed?: boolean;
}) {
  const isLocked = weightsConfirmed === true;
  const [dressedWeight, setDressedWeight] = useState(hangingWeight ?? MIN_WEIGHT);
  const activeWeight = isLocked && hangingWeight !== null ? hangingWeight : dressedWeight;

  const { fixed, processingRate } = splitExpenses(expenses);
  const { processingCost, total } = calcTotal(
    fixed,
    processingRate,
    activeWeight
  );

  const costPerSlot = totalSlots > 0 ? total / totalSlots : 0;
  const weightPerSlot = totalSlots > 0 ? activeWeight / totalSlots : 0;
  const costPerKg = weightPerSlot > 0 ? costPerSlot / weightPerSlot : 0;

  const fillPercent =
    ((activeWeight - MIN_WEIGHT) / (MAX_WEIGHT - MIN_WEIGHT)) * 100;

  const estLabel = weightsConfirmed ? "" : " (est.)";

  if (fixed.length === 0 && processingRate === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No costs logged yet. Check back once expenses start rolling in.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* Expense line items */}
      <div className="space-y-2 text-sm">
        {fixed.map((e) => (
          <div key={e.id} className="flex items-center justify-between">
            <span className="text-muted-foreground">{e.description}</span>
            <span className="font-medium">${Number(e.amount).toFixed(0)}</span>
          </div>
        ))}
        {processingRate > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              Processing (${processingRate.toFixed(2)}/kg)
            </span>
            <span className="font-medium">${processingCost.toFixed(0)}</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t pt-2 font-semibold">
          <span>Total</span>
          <span>${total.toFixed(0)}</span>
        </div>
      </div>

      {/* Weight Slider */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {isLocked ? "Confirmed Dressed Weight" : "Estimated Dressed Weight"}
            </span>
            {isLocked && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Lock className="h-3 w-3" />
                Locked
              </Badge>
            )}
          </div>
          <span className="text-2xl font-bold tabular-nums text-accent">
            {activeWeight} kg
          </span>
        </div>
        <input
          type="range"
          min={MIN_WEIGHT}
          max={MAX_WEIGHT}
          step={5}
          value={activeWeight}
          onChange={(e) => setDressedWeight(Number(e.target.value))}
          disabled={isLocked}
          className="range-slider w-full"
          style={{ "--fill": `${fillPercent}%` } as React.CSSProperties}
          aria-label="Adjust estimated dressed weight"
        />
        <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
          <span>{MIN_WEIGHT} kg</span>
          <span>{MAX_WEIGHT} kg</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center p-3 text-center">
            <Weight className="mb-1 h-5 w-5 text-primary" />
            <p className="text-lg font-bold tabular-nums">
              {weightPerSlot.toFixed(1)}kg
            </p>
            <p className="text-[11px] leading-tight text-muted-foreground">
              Per {shareSize}{estLabel}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-3 text-center">
            <DollarSign className="mb-1 h-5 w-5 text-accent" />
            <p className="text-lg font-bold tabular-nums">
              ${costPerSlot.toFixed(0)}
            </p>
            <p className="text-[11px] leading-tight text-muted-foreground">
              Per Share{estLabel}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-3 text-center">
            <Tag className="mb-1 h-5 w-5 text-primary" />
            <p className="text-lg font-bold tabular-nums">
              ${costPerKg.toFixed(2)}
            </p>
            <p className="text-[11px] leading-tight text-muted-foreground">
              Per kg{estLabel}
            </p>
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {isLocked
          ? `Based on ${hangingWeight}kg confirmed dressed weight, split ${totalSlots} ways.`
          : "All estimates are calculated off the low end of the range — actual costs may come in under."}{" "}
        All numbers are based off dressed weight.
      </p>
    </div>
  );
}

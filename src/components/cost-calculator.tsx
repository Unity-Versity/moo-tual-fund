"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Weight, DollarSign, Tag } from "lucide-react";
import type { Expense } from "@/lib/types";

const TOTAL_SLOTS = 8;

export function CostCalculator({
  expenses,
  hangingWeight,
}: {
  expenses: Expense[];
  hangingWeight: number | null;
}) {
  const totalCost = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const costPerSlot = totalCost / TOTAL_SLOTS;
  const weightPerSlot = hangingWeight ? hangingWeight / TOTAL_SLOTS : null;
  const costPerKg = weightPerSlot ? costPerSlot / weightPerSlot : null;

  if (expenses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No costs logged yet. Check back once expenses start rolling in.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2 text-sm">
        {expenses.map((e) => (
          <div key={e.id} className="flex items-center justify-between">
            <span className="text-muted-foreground">{e.description}</span>
            <span className="font-medium">${Number(e.amount).toFixed(0)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between border-t pt-2 font-semibold">
          <span>Total</span>
          <span>${totalCost.toFixed(0)}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {weightPerSlot && (
          <Card>
            <CardContent className="flex flex-col items-center p-3 text-center">
              <Weight className="mb-1 h-5 w-5 text-primary" />
              <p className="text-lg font-bold tabular-nums">
                {weightPerSlot.toFixed(1)}kg
              </p>
              <p className="text-[11px] leading-tight text-muted-foreground">
                Your 1/8th
              </p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="flex flex-col items-center p-3 text-center">
            <DollarSign className="mb-1 h-5 w-5 text-accent" />
            <p className="text-lg font-bold tabular-nums">
              ${costPerSlot.toFixed(0)}
            </p>
            <p className="text-[11px] leading-tight text-muted-foreground">
              Per Share
            </p>
          </CardContent>
        </Card>
        {costPerKg && (
          <Card>
            <CardContent className="flex flex-col items-center p-3 text-center">
              <Tag className="mb-1 h-5 w-5 text-primary" />
              <p className="text-lg font-bold tabular-nums">
                ${costPerKg.toFixed(2)}
              </p>
              <p className="text-[11px] leading-tight text-muted-foreground">
                Per kg
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {hangingWeight
          ? `Based on ${hangingWeight}kg dressed weight, split 8 ways.`
          : "Split 8 ways. Per-kg price available once dressed weight is confirmed."}{" "}
        Prep upgrades (e.g. pre-cooked mince) are charged separately per household.
      </p>
    </div>
  );
}

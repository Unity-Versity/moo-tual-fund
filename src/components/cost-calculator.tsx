"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Weight, DollarSign, Tag } from "lucide-react";

const TOTAL_SLOTS = 8;
const MIN_WEIGHT = 140;
const MAX_WEIGHT = 180;

const COSTS = {
  farmer: 900,
  butcherBase: 450,
  butcherPerKg: 3.3,
  mealPrep: 140,
  smoker: 40,
};

const FIXED_TOTAL =
  COSTS.farmer + COSTS.butcherBase + COSTS.mealPrep + COSTS.smoker;

export function CostCalculator({
  hangingWeight,
}: {
  hangingWeight: number | null;
}) {
  const [dressedWeight, setDressedWeight] = useState(hangingWeight ?? 160);

  const butcherVariable = COSTS.butcherPerKg * dressedWeight;
  const totalCost = FIXED_TOTAL + butcherVariable;
  const costPerSlot = totalCost / TOTAL_SLOTS;
  const perSlot = dressedWeight / TOTAL_SLOTS;
  const costPerKg = perSlot > 0 ? costPerSlot / perSlot : 0;

  const fillPercent =
    ((dressedWeight - MIN_WEIGHT) / (MAX_WEIGHT - MIN_WEIGHT)) * 100;

  return (
    <div className="space-y-5">
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">The Farmer</span>
          <span className="font-medium">${COSTS.farmer}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            The Butcher (base + ${COSTS.butcherPerKg.toFixed(2)}/kg)
          </span>
          <span className="font-medium">
            ${(COSTS.butcherBase + butcherVariable).toFixed(0)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Meal Prep</span>
          <span className="font-medium">${COSTS.mealPrep}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Smoker</span>
          <span className="font-medium">${COSTS.smoker}</span>
        </div>
        <div className="flex items-center justify-between border-t pt-2 font-semibold">
          <span>Total</span>
          <span>${totalCost.toFixed(0)}</span>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium">Estimated Dressed Weight</span>
          <span className="text-2xl font-bold tabular-nums text-accent">
            {dressedWeight} kg
          </span>
        </div>
        <input
          type="range"
          min={MIN_WEIGHT}
          max={MAX_WEIGHT}
          step={5}
          value={dressedWeight}
          onChange={(e) => setDressedWeight(Number(e.target.value))}
          className="range-slider w-full"
          style={{ "--fill": `${fillPercent}%` } as React.CSSProperties}
          aria-label="Adjust estimated dressed weight"
        />
        <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
          <span>{MIN_WEIGHT} kg</span>
          <span>{MAX_WEIGHT} kg</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center p-3 text-center">
            <Weight className="mb-1 h-5 w-5 text-primary" />
            <p className="text-lg font-bold tabular-nums">
              {perSlot.toFixed(1)}kg
            </p>
            <p className="text-[11px] leading-tight text-muted-foreground">
              Your 1/8th
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
              Per Share
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
              Per kg
            </p>
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Dressed weight split 8 ways. Final price locked in once we get the
        actual dressed weight.
      </p>
    </div>
  );
}

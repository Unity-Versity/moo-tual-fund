"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Minus, Check } from "lucide-react";
import { setShareCount } from "./actions";
import { toast } from "sonner";

export function SharePicker({
  currentShares,
  totalSlots,
  availableSlots,
}: {
  currentShares: number;
  totalSlots: number;
  availableSlots: number;
}) {
  const [desired, setDesired] = useState(currentShares);
  const [isPending, startTransition] = useTransition();

  const maxAllowed = currentShares + availableSlots;
  const hasChanged = desired !== currentShares;

  function handleSave() {
    startTransition(async () => {
      const result = await setShareCount(desired);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          desired === 0
            ? "Shares released."
            : `${desired} share${desired > 1 ? "s" : ""} locked in! 🐄`
        );
      }
    });
  }

  return (
    <Card className="border-accent/30 bg-accent/5">
      <CardContent className="p-5">
        <div className="flex flex-col items-center gap-4">
          <div className="text-center">
            <p className="text-lg font-bold">
              {currentShares === 0
                ? "How much beef do you want?"
                : `You've got ${currentShares} share${currentShares > 1 ? "s" : ""}`}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Each share is 1/{totalSlots}th of the steer. More shares = more
              beef + more prep choices.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDesired((d) => Math.max(0, d - 1))}
              disabled={isPending || desired <= 0}
              aria-label="Remove a share"
            >
              <Minus className="h-4 w-4" />
            </Button>

            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold tabular-nums">{desired}</span>
              <span className="text-xs text-muted-foreground">
                share{desired !== 1 ? "s" : ""}
              </span>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setDesired((d) => Math.min(maxAllowed, d + 1))}
              disabled={isPending || desired >= maxAllowed}
              aria-label="Add a share"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {availableSlots === 0 && currentShares === 0 && (
            <p className="text-sm text-muted-foreground">
              All shares are taken! Check back later or ask if anyone wants to
              split.
            </p>
          )}

          {hasChanged && (
            <Button
              className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
              size="lg"
              onClick={handleSave}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {currentShares === 0
                ? `Claim ${desired} Share${desired > 1 ? "s" : ""}`
                : desired === 0
                  ? "Release All Shares"
                  : `Update to ${desired} Share${desired > 1 ? "s" : ""}`}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

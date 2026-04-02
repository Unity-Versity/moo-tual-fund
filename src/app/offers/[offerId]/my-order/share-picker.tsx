"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Loader2 } from "lucide-react";
import { setShareCount } from "./actions";
import { toast } from "sonner";

export function SharePicker({
  offerId,
  currentShares,
  totalSlots,
  availableSlots,
  shareSize,
}: {
  offerId: string;
  currentShares: number;
  totalSlots: number;
  availableSlots: number;
  shareSize: string;
}) {
  const maxShares = currentShares + availableSlots;
  const [desired, setDesired] = useState(currentShares);
  const [isPending, startTransition] = useTransition();
  const hasChanged = desired !== currentShares;

  function handleSave() {
    startTransition(async () => {
      const result = await setShareCount(offerId, desired);
      if (result.error) {
        toast.error(result.error);
        setDesired(currentShares);
      } else {
        toast.success(
          desired > currentShares
            ? "Shares claimed! Welcome to the herd 🐄"
            : desired === 0
              ? "Shares released."
              : "Shares updated!"
        );
      }
    });
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Your Shares</p>
            <p className="text-xs text-muted-foreground">
              {availableSlots > 0
                ? `${availableSlots} of ${totalSlots} still available`
                : "All shares taken"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setDesired(Math.max(0, desired - 1))}
              disabled={desired <= 0 || isPending}
            >
              <Minus className="h-4 w-4" />
            </Button>

            <div className="flex min-w-[3rem] flex-col items-center">
              <span className="text-2xl font-bold tabular-nums">{desired}</span>
              <span className="text-[10px] text-muted-foreground">
                {shareSize} share{desired !== 1 ? "s" : ""}
              </span>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setDesired(Math.min(maxShares, desired + 1))}
              disabled={desired >= maxShares || isPending}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {hasChanged && (
          <Button
            className="mt-3 w-full bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : desired > currentShares ? (
              "Claim"
            ) : (
              "Update"
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

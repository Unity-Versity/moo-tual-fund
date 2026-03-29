"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, User } from "lucide-react";
import { claimSlot, unclaimSlot } from "./actions";
import type { Slot, SessionData } from "@/lib/types";
import { toast } from "sonner";

type SlotWithHousehold = Omit<Slot, "household"> & {
  household: { id: string; name: string } | null;
};

export function SlotGrid({
  slots,
  session,
}: {
  slots: SlotWithHousehold[];
  session: SessionData | null;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClaim(slotId: string) {
    setPending(slotId);
    startTransition(async () => {
      const result = await claimSlot(slotId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Slot claimed! Welcome to the herd 🐄");
      }
      setPending(null);
    });
  }

  function handleUnclaim(slotId: string) {
    setPending(slotId);
    startTransition(async () => {
      const result = await unclaimSlot(slotId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Slot released.");
      }
      setPending(null);
    });
  }

  const isOwner = (slot: SlotWithHousehold) =>
    session?.type === "household" &&
    slot.household?.id === session.household_id;

  const isAdmin = session?.type === "admin";

  return (
    <div className="grid grid-cols-2 gap-3">
      {slots.map((slot) => {
        const claimed = slot.is_claimed;
        const mine = isOwner(slot);
        const isLoading = pending === slot.id && isPending;

        return (
          <Card
            key={slot.id}
            className={`relative transition-all ${
              mine
                ? "border-accent ring-2 ring-accent/20"
                : claimed
                  ? "border-primary/30 bg-primary/5"
                  : "border-dashed border-muted-foreground/30 hover:border-accent/50"
            }`}
          >
            <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Slot {slot.slot_number}
                </span>
                {mine && (
                  <Badge variant="default" className="bg-accent text-xs">
                    Yours
                  </Badge>
                )}
              </div>

              {claimed ? (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-semibold">
                    {slot.household?.name ?? "Claimed"}
                  </p>
                  {(mine || isAdmin) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground"
                      onClick={() => handleUnclaim(slot.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : null}
                      Release
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30">
                    <span className="text-lg">🐄</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Available</p>
                  {session?.type === "household" && (
                    <Button
                      size="sm"
                      className="bg-accent text-accent-foreground hover:bg-accent/90"
                      onClick={() => handleClaim(slot.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="mr-1 h-3 w-3" />
                      )}
                      Claim
                    </Button>
                  )}
                  {!session && (
                    <p className="text-xs text-muted-foreground">Login to claim</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

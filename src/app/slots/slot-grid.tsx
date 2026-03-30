"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Minus } from "lucide-react";
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

  const totalSlots = slots.length;
  const claimedSlots = slots.filter((s) => s.is_claimed);
  const mySlots = slots.filter(
    (s) =>
      s.is_claimed &&
      session?.type === "household" &&
      s.household?.id === session.household_id
  );
  const availableSlots = slots.filter((s) => !s.is_claimed);
  const isAdmin = session?.type === "admin";

  // Group claimed slots by household
  const byHousehold = claimedSlots.reduce(
    (acc, s) => {
      const name = s.household?.name ?? "Unknown";
      if (!acc[name]) acc[name] = [];
      acc[name].push(s);
      return acc;
    },
    {} as Record<string, SlotWithHousehold[]>
  );

  function handleClaim(slotId: string) {
    setPending(slotId);
    startTransition(async () => {
      const result = await claimSlot(slotId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Share claimed! Welcome to the herd 🐄");
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
        toast.success("Share released.");
      }
      setPending(null);
    });
  }

  // Grab the next available slot for the "Add a share" button
  const nextAvailable = availableSlots[0];

  // Get an available slot to release (last one the user claimed)
  const lastMine = [...mySlots].reverse()[0];

  return (
    <div className="space-y-6">
      {/* ── Visual allocation bar ── */}
      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">
            {claimedSlots.length}/{totalSlots} shares claimed
          </span>
          <span className="text-muted-foreground">
            {availableSlots.length} available
          </span>
        </div>
        <div className="flex gap-1">
          {slots.map((slot) => {
            const mine =
              session?.type === "household" &&
              slot.household?.id === session.household_id;
            return (
              <div
                key={slot.id}
                className={`h-8 flex-1 rounded-md transition-all ${
                  mine
                    ? "bg-accent"
                    : slot.is_claimed
                      ? "bg-primary/60"
                      : "bg-muted border border-dashed border-muted-foreground/20"
                }`}
                title={
                  mine
                    ? `Your share (#${slot.slot_number})`
                    : slot.is_claimed
                      ? `${slot.household?.name ?? "Claimed"} (#${slot.slot_number})`
                      : `Available (#${slot.slot_number})`
                }
              />
            );
          })}
        </div>
        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-accent" />
            Yours
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-primary/60" />
            Taken
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm border border-dashed border-muted-foreground/20 bg-muted" />
            Available
          </span>
        </div>
      </div>

      {/* ── Your shares ── */}
      {session?.type === "household" && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {mySlots.length === 0
                    ? "You haven't claimed any shares yet"
                    : `You have ${mySlots.length} share${mySlots.length > 1 ? "s" : ""}`}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {mySlots.length === 0
                    ? "Each share is 1/8th of the steer. Grab as many as you like!"
                    : `That's ${mySlots.length}/8 of the steer`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {mySlots.length > 0 && lastMine && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => handleUnclaim(lastMine.id)}
                    disabled={isPending}
                    aria-label="Remove a share"
                  >
                    {pending === lastMine.id && isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Minus className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {nextAvailable && (
                  <Button
                    size="icon"
                    className="h-9 w-9 bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={() => handleClaim(nextAvailable.id)}
                    disabled={isPending}
                    aria-label="Add a share"
                  >
                    {pending === nextAvailable.id && isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Who's got what ── */}
      {claimedSlots.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            The Herd
          </p>
          <div className="space-y-2">
            {Object.entries(byHousehold).map(([name, hSlots]) => {
              const isMine =
                session?.type === "household" &&
                hSlots[0]?.household?.id === session.household_id;
              return (
                <div
                  key={name}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    isMine ? "border-accent/30 bg-accent/5" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{name}</span>
                    {isMine && (
                      <Badge variant="default" className="bg-accent text-xs">
                        You
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {hSlots.length} share{hSlots.length > 1 ? "s" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Admin: detailed slot management ── */}
      {isAdmin && (
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            Admin — All Slots
          </p>
          <div className="grid grid-cols-4 gap-2">
            {slots.map((slot) => (
              <Card key={slot.id} className="text-center">
                <CardContent className="p-2">
                  <p className="text-xs text-muted-foreground">#{slot.slot_number}</p>
                  <p className="text-xs font-medium truncate">
                    {slot.household?.name ?? "—"}
                  </p>
                  {slot.is_claimed && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-6 text-[10px] text-muted-foreground"
                      onClick={() => handleUnclaim(slot.id)}
                      disabled={isPending}
                    >
                      Release
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

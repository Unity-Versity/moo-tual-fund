"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Minus } from "lucide-react";
import { claimSlot, unclaimSlot } from "./actions";
import type { Slot, SessionData } from "@/lib/types";
import { toast } from "sonner";

type SlotWithHousehold = Omit<Slot, "household"> & {
  household: { id: string; name: string } | null;
};

function SteerRing({
  total,
  mine,
  otherClaimed,
}: {
  total: number;
  mine: number;
  otherClaimed: number;
}) {
  const size = 220;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const segmentGap = 4;
  const gapAngle = (segmentGap / circumference) * 360;
  const segmentAngle = 360 / total - gapAngle;
  const segmentLength = (segmentAngle / 360) * circumference;

  const segments = Array.from({ length: total }, (_, i) => {
    const startAngle = i * (360 / total) - 90;
    const offset = circumference - segmentLength;
    let color = "var(--muted)";
    let opacity = 0.4;

    if (i < mine) {
      color = "var(--accent)";
      opacity = 1;
    } else if (i < mine + otherClaimed) {
      color = "var(--primary)";
      opacity = 0.5;
    }

    return (
      <circle
        key={i}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${segmentLength} ${offset}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        opacity={opacity}
        transform={`rotate(${startAngle} ${size / 2} ${size / 2})`}
        className="transition-all duration-500"
      />
    );
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments}
    </svg>
  );
}

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
  const mySlots = slots.filter(
    (s) =>
      s.is_claimed &&
      session?.type === "household" &&
      s.household?.id === session.household_id
  );
  const otherClaimed = slots.filter(
    (s) =>
      s.is_claimed &&
      !(
        session?.type === "household" &&
        s.household?.id === session.household_id
      )
  );
  const availableSlots = slots.filter((s) => !s.is_claimed);
  const isAdmin = session?.type === "admin";

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

  const nextAvailable = availableSlots[0];
  const lastMine = [...mySlots].reverse()[0];

  return (
    <div className="space-y-6">
      {/* ── Steer ring chart ── */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <SteerRing
            total={totalSlots}
            mine={mySlots.length}
            otherClaimed={otherClaimed.length}
          />
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl">🐄</span>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {availableSlots.length}/{totalSlots}
            </p>
            <p className="text-xs text-muted-foreground">available</p>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-3 flex items-center gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-accent" />
            Yours ({mySlots.length})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-primary/50" />
            Taken ({otherClaimed.length})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-muted opacity-40" />
            Open ({availableSlots.length})
          </span>
        </div>
      </div>

      {/* ── Your shares + controls ── */}
      {session?.type === "household" && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-5">
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                {mySlots.length === 0 ? (
                  <>
                    <p className="text-lg font-bold">Grab your share</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Each share is 1/8th of the steer. Want more beef? Grab more shares.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-bold">
                      {mySlots.length} share{mySlots.length > 1 ? "s" : ""} claimed
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      That&apos;s {mySlots.length}/8 of the steer
                      {mySlots.length > 1 ? " — nice haul!" : ""}
                    </p>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                {mySlots.length > 0 && lastMine && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="gap-2"
                    onClick={() => handleUnclaim(lastMine.id)}
                    disabled={isPending}
                    aria-label="Remove a share"
                  >
                    {pending === lastMine.id && isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Minus className="h-4 w-4" />
                    )}
                    Remove
                  </Button>
                )}
                {nextAvailable && (
                  <Button
                    size="lg"
                    className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={() => handleClaim(nextAvailable.id)}
                    disabled={isPending}
                    aria-label="Add a share"
                  >
                    {pending === nextAvailable.id && isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {mySlots.length === 0 ? "Claim a Share" : "Add Another"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
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

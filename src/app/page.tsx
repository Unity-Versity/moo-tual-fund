import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { COW_STAGES, STAGE_LABELS, STAGE_DESCRIPTIONS } from "@/lib/types";
import type { CowStatus, Slot } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, Weight, Users, ChevronRight, Check } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

async function getData() {
  const supabase = await createServerSupabaseClient();

  const [statusRes, slotsRes] = await Promise.all([
    supabase.from("cow_status").select("*").limit(1).single(),
    supabase.from("slots").select("*, household:households(name)"),
  ]);

  return {
    status: statusRes.data as CowStatus | null,
    slots: (slotsRes.data ?? []) as (Slot & { household: { name: string } | null })[],
  };
}

function JourneyStep({
  stage,
  currentIndex,
  stepIndex,
}: {
  stage: (typeof COW_STAGES)[number];
  currentIndex: number;
  stepIndex: number;
}) {
  const isComplete = stepIndex < currentIndex;
  const isCurrent = stepIndex === currentIndex;
  const isFuture = stepIndex > currentIndex;

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
            isComplete
              ? "border-primary bg-primary text-primary-foreground"
              : isCurrent
                ? "border-accent bg-accent text-accent-foreground scale-110"
                : "border-muted-foreground/30 bg-muted text-muted-foreground"
          }`}
        >
          {isComplete ? <Check className="h-4 w-4" /> : stepIndex + 1}
        </div>
        {stepIndex < COW_STAGES.length - 1 && (
          <div
            className={`mt-1 w-0.5 flex-1 ${
              isComplete ? "bg-primary" : "bg-muted-foreground/20"
            }`}
            style={{ minHeight: "2rem" }}
          />
        )}
      </div>
      <div className={`pb-6 ${isFuture ? "opacity-50" : ""}`}>
        <p className={`text-sm font-semibold ${isCurrent ? "text-accent" : ""}`}>
          {STAGE_LABELS[stage]}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {STAGE_DESCRIPTIONS[stage]}
        </p>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const { status, slots } = await getData();
  const session = await getSession();

  const claimedSlots = slots.filter((s) => s.is_claimed);
  const currentStageIndex = status
    ? COW_STAGES.indexOf(status.stage)
    : 0;

  const estWeightPerSlot = status?.total_take_home_kg
    ? (status.total_take_home_kg / 8).toFixed(1)
    : status?.hanging_weight_kg
      ? ((status.hanging_weight_kg * 0.65) / 8).toFixed(1)
      : "~50";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome to the Herd 🐄</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Four households, one steer, zero drama. Track your beef from paddock to plate.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center p-3 text-center">
            <Users className="mb-1 h-5 w-5 text-primary" />
            <p className="text-lg font-bold">{claimedSlots.length}/8</p>
            <p className="text-xs text-muted-foreground">Slots Claimed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-3 text-center">
            <Weight className="mb-1 h-5 w-5 text-primary" />
            <p className="text-lg font-bold">{estWeightPerSlot}kg</p>
            <p className="text-xs text-muted-foreground">Est. Per Slot</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-3 text-center">
            <Calendar className="mb-1 h-5 w-5 text-primary" />
            <p className="text-lg font-bold">
              {status?.est_raw_pickup
                ? format(new Date(status.est_raw_pickup), "d MMM")
                : "TBD"}
            </p>
            <p className="text-xs text-muted-foreground">Raw Pickup</p>
          </CardContent>
        </Card>
      </div>

      {/* Key Dates */}
      {status && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Key Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {status.est_sacrifice_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">The Last Moo-ving Day</span>
                <span className="font-medium">
                  {format(new Date(status.est_sacrifice_date), "d MMMM yyyy")}
                </span>
              </div>
            )}
            {status.hanging_weight_kg && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hanging Weight</span>
                <span className="font-medium">{status.hanging_weight_kg}kg</span>
              </div>
            )}
            {status.est_raw_pickup && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Raw Pickup</span>
                <span className="font-medium">
                  {format(new Date(status.est_raw_pickup), "d MMMM yyyy")}
                </span>
              </div>
            )}
            {status.est_smoked_pickup && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Smoked Pickup</span>
                <span className="font-medium">
                  {format(new Date(status.est_smoked_pickup), "d MMMM yyyy")}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Cow Journey */}
      <div>
        <h2 className="mb-4 text-lg font-bold">The Cow&apos;s Journey</h2>
        <div className="flex flex-col">
          {COW_STAGES.map((stage, i) => (
            <JourneyStep
              key={stage}
              stage={stage}
              currentIndex={currentStageIndex}
              stepIndex={i}
            />
          ))}
        </div>
      </div>

      <Separator />

      {/* CTA */}
      <div className="flex flex-col gap-3">
        {claimedSlots.length < 8 && (
          <Link href="/slots">
            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" size="lg">
              Claim Your Steak
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        )}
        <Link href="/my-order">
          <Button variant="outline" className="w-full" size="lg">
            View My Order
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Who's In */}
      {claimedSlots.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Who&apos;s in the Herd?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {claimedSlots.map((slot) => (
                <Badge key={slot.id} variant="secondary" className="text-sm">
                  {slot.household?.name ?? "Unknown"} (Slot {slot.slot_number})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

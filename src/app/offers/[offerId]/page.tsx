import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import { OFFER_STAGES, STAGE_LABELS, STAGE_DESCRIPTIONS, ANIMAL_LABELS } from "@/lib/types";
import type { Offer, OfferSlot, OfferAnimal, Expense } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronRight, Bone, Info } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { CostCalculator } from "@/components/cost-calculator";
import { StatusBanner } from "@/components/status-banner";

async function getData(offerId: string) {
  const supabase = await createServerSupabaseClient();

  const [offerRes, slotsRes, animalsRes, expensesRes] = await Promise.all([
    supabase.from("offers").select("*").eq("id", offerId).single(),
    supabase.from("offer_slots").select("*, household:households(name)").eq("offer_id", offerId),
    supabase.from("offer_animals").select("*").eq("offer_id", offerId).order("animal_number"),
    supabase.from("expenses").select("*").eq("offer_id", offerId).order("created_at"),
  ]);

  return {
    offer: offerRes.data as Offer | null,
    slots: (slotsRes.data ?? []) as (OfferSlot & { household: { name: string } | null })[],
    animals: (animalsRes.data ?? []) as OfferAnimal[],
    expenses: (expensesRes.data ?? []) as Expense[],
  };
}

function JourneyStep({
  stage,
  currentIndex,
  stepIndex,
}: {
  stage: (typeof OFFER_STAGES)[number];
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
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
            isComplete
              ? "border-primary bg-primary text-primary-foreground"
              : isCurrent
                ? "border-accent bg-accent text-accent-foreground scale-110"
                : "border-muted-foreground/30 bg-muted text-muted-foreground"
          }`}
        >
          {isComplete ? <Check className="h-3.5 w-3.5" /> : stepIndex + 1}
        </div>
        {stepIndex < OFFER_STAGES.length - 1 && (
          <div
            className={`mt-1 w-0.5 flex-1 ${
              isComplete ? "bg-primary" : "bg-muted-foreground/20"
            }`}
            style={{ minHeight: "1.25rem" }}
          />
        )}
      </div>
      <div className={`pb-4 ${isFuture ? "opacity-40" : ""}`}>
        <p
          className={`text-sm font-semibold ${isCurrent ? "text-accent" : ""}`}
        >
          {STAGE_LABELS[stage]}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {STAGE_DESCRIPTIONS[stage]}
        </p>
      </div>
    </div>
  );
}

export default async function OfferDetailPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { offerId } = await params;
  const { offer, slots, animals, expenses } = await getData(offerId);

  if (!offer) notFound();

  const claimedSlots = slots.filter((s) => s.is_claimed);
  const availableSlots = slots.length - claimedSlots.length;
  const currentStageIndex = OFFER_STAGES.indexOf(offer.stage);

  // Sum hanging weights across all animals for cost calculator
  const totalHangingWeight = animals.reduce(
    (sum, a) => sum + (a.hanging_weight_kg ? Number(a.hanging_weight_kg) : 0),
    0
  );
  const hangingWeight = totalHangingWeight > 0 ? totalHangingWeight : null;

  return (
    <div className="flex flex-col gap-8">
      <StatusBanner offer={offer} />

      {/* ── Header ── */}
      <section>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Link href="/offers" className="hover:text-foreground">Offers</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{offer.title}</span>
        </div>
        <h1 className="text-2xl font-bold">{offer.title}</h1>
        {offer.description && (
          <p className="mt-1.5 text-sm text-muted-foreground">
            {offer.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="outline">{ANIMAL_LABELS[offer.animal_type]}</Badge>
          <Badge variant="outline">{offer.animal_count} {offer.animal_type === "beef" ? "beast" : "animal"}{offer.animal_count > 1 ? "s" : ""}</Badge>
          <Badge variant="outline">{offer.share_size} shares</Badge>
          <Badge
            variant="outline"
            className={availableSlots > 0
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
              : ""}
          >
            {availableSlots > 0
              ? `${availableSlots} share${availableSlots > 1 ? "s" : ""} available`
              : "Fully claimed"}
          </Badge>
        </div>
      </section>

      {/* ── Source Info ── */}
      {offer.source_info && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex gap-3 p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <h3 className="text-sm font-semibold">Source</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {offer.source_info}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* ── What You Need To Do ── */}
      <section>
        <h2 className="mb-3 text-lg font-bold">What You Need To Do</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Claim your share</strong> —
            pick your size on the{" "}
            <Link href={`/offers/${offer.id}/my-order`} className="font-medium text-primary underline">
              order page
            </Link>.
          </li>
          <li>
            <strong className="text-foreground">Choose your prep</strong>{" "}
            — select how you want each cut prepared.
          </li>
          <li>
            <strong className="text-foreground">Pay when priced</strong>{" "}
            — final cost locks in after weigh-in. Details on the{" "}
            <Link href={`/offers/${offer.id}/costs`} className="font-medium text-primary underline">
              costs page
            </Link>.
          </li>
        </ol>
      </section>

      <Separator />

      {/* ── Dates ── */}
      <section>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {offer.est_sacrifice_date && (
            <div className="rounded-md bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">Processing Date</p>
              <p className="font-medium">
                {format(new Date(offer.est_sacrifice_date), "d MMM yyyy")}
              </p>
            </div>
          )}
          {hangingWeight && (
            <div className="rounded-md bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">Total Hanging Weight</p>
              <p className="font-medium">{hangingWeight} kg</p>
            </div>
          )}
          {offer.est_raw_pickup && (
            <div className="rounded-md bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">Raw Pickup</p>
              <p className="font-medium">
                {format(new Date(offer.est_raw_pickup), "d MMM yyyy")}
              </p>
            </div>
          )}
          {offer.est_smoked_pickup && (
            <div className="rounded-md bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">Smoked Pickup</p>
              <p className="font-medium">
                {format(new Date(offer.est_smoked_pickup), "d MMM yyyy")}
              </p>
            </div>
          )}
        </div>
      </section>

      <Separator />

      {/* ── The Numbers ── */}
      <section>
        <h2 className="mb-2 text-lg font-bold">The Numbers</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Drag the slider to estimate costs at different dressed weights.
        </p>
        <CostCalculator
          expenses={expenses}
          hangingWeight={hangingWeight}
          totalSlots={offer.total_slots}
          shareSize={offer.share_size}
          weightsConfirmed={offer.weights_confirmed}
        />
      </section>

      <Separator />

      {/* ── Bones & Tallow ── */}
      <Card className="border-earth/20 bg-earth-light/30">
        <CardContent className="flex gap-3 p-4">
          <Bone className="mt-0.5 h-5 w-5 shrink-0 text-earth" />
          <div>
            <h3 className="text-sm font-semibold">Bones &amp; Tallow</h3>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
              Bones and fat go to stock and tallow. Want some? Add a note to your order.
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* ── Journey ── */}
      <section>
        <h2 className="mb-4 text-lg font-bold">Where We&apos;re At</h2>
        <div className="flex flex-col">
          {OFFER_STAGES.map((stage, i) => (
            <JourneyStep
              key={stage}
              stage={stage}
              currentIndex={currentStageIndex}
              stepIndex={i}
            />
          ))}
        </div>
      </section>

      <Separator />

      {/* ── CTAs ── */}
      <section className="flex flex-col gap-3">
        <Link href={`/offers/${offer.id}/my-order`}>
          <Button
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            size="lg"
          >
            {availableSlots > 0 ? "Claim Your Share" : "View My Order"}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
        <Link href={`/offers/${offer.id}/costs`}>
          <Button variant="outline" className="w-full" size="lg">
            View Cost Breakdown
          </Button>
        </Link>
      </section>
    </div>
  );
}

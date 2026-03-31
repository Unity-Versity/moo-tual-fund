import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { COW_STAGES, STAGE_LABELS, STAGE_DESCRIPTIONS } from "@/lib/types";
import type { CowStatus, Slot, Expense } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Check, ChevronRight, Bone } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import Image from "next/image";
import { CostCalculator } from "@/components/cost-calculator";

async function getData() {
  const supabase = await createServerSupabaseClient();

  const [statusRes, slotsRes, expensesRes] = await Promise.all([
    supabase.from("cow_status").select("*").limit(1).single(),
    supabase.from("slots").select("*, household:households(name)"),
    supabase.from("expenses").select("*").order("created_at"),
  ]);

  return {
    status: statusRes.data as CowStatus | null,
    slots: (slotsRes.data ?? []) as (Slot & {
      household: { name: string } | null;
    })[],
    expenses: (expensesRes.data ?? []) as Expense[],
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
        {stepIndex < COW_STAGES.length - 1 && (
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

export default async function HomePage() {
  const { status, slots, expenses } = await getData();
  const session = await getSession();

  const claimedSlots = slots.filter((s) => s.is_claimed);
  const currentStageIndex = status ? COW_STAGES.indexOf(status.stage) : 0;

  const displayName =
    session?.type === "household" ? session.household_name : null;

  return (
    <div className="flex flex-col gap-8">
      {/* ── Welcome ── */}
      <section>
        <h1 className="text-2xl font-bold">
          {displayName ? `Hey ${displayName}` : "Hey"} 👋
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          This is a quiet little group of family and friends going in on a whole
          steer together. No shop, no middlemen — just a shared bulk order split
          eight ways. This site keeps track of where things are at so we
          don&apos;t clog up the group chat.
        </p>
      </section>

      {/* ── How It Works ── */}
      <section>
        <h2 className="mb-3 text-lg font-bold">How It Works</h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Corey has sourced a whole steer from a local farmer. Once
            it&apos;s processed, he&apos;ll be preparing the cuts that usually
            get overlooked — smoking brisket and ribs low and slow, turning
            chuck into pulled beef, smoking brisket, making bolognaise and
            Mexican mince — all the bulk food prepping that turns a side of
            beef into actual meals in your freezer.
          </p>
          <p>
            Everything gets vacuum-sealed and portioned so it&apos;s
            freezer-ready from day one.
          </p>
        </div>
      </section>

      <Separator />

      {/* ── What To Do ── */}
      <section>
        <h2 className="mb-3 text-lg font-bold">What You Need To Do</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Claim your share(s)</strong> —
            head to{" "}
            <Link href="/my-order" className="font-medium text-primary underline">
              your order page
            </Link>{" "}
            and grab as many as you want. One share = 1/8th of the steer.
          </li>
          <li>
            <strong className="text-foreground">Choose your variations</strong>{" "}
            — on your{" "}
            <Link
              href="/my-order"
              className="font-medium text-primary underline"
            >
              order page
            </Link>
            , pick how you want things like mince and slow-cook cuts prepared
            (raw, bolognaise, pulled beef, etc).
          </li>
          <li>
            <strong className="text-foreground">Wait for the final price</strong>{" "}
            — once we get the actual dressed weight back from the butcher,
            the exact share price gets calculated automatically.
          </li>
          <li>
            <strong className="text-foreground">Pay up</strong> — payment
            details will be on the{" "}
            <Link href="/costs" className="font-medium text-primary underline">
              costs page
            </Link>
            .
          </li>
          <li>
            <strong className="text-foreground">Make some freezer space</strong>{" "}
            — you&apos;ll need roughly one to two shelves of a standard
            freezer.
          </li>
          <li>
            <strong className="text-foreground">
              Expect delivery before Easter
            </strong>{" "}
            — Corey will drop it off to you.
          </li>
        </ol>
      </section>

      <Separator />

      {/* ── What's In a Share ── */}
      <section>
        <h2 className="mb-2 text-lg font-bold">What&apos;s In a Share</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Every share is the same — roughly a 1/8th of the whole animal. As a
          general guide, expect something like:
        </p>

        <div className="mb-3 grid grid-cols-3 gap-3">
          {[
            { label: "Steaks", emoji: "🥩", desc: "Scotch, rump, T-bone, etc." },
            { label: "Big Cuts", emoji: "🍖", desc: "Roasts, brisket, ribs" },
            { label: "Mince & Slow Cook", emoji: "🍲", desc: "Pulled beef, bolognaise, braised" },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="flex flex-col items-center gap-1 p-3 text-center">
                <span className="text-2xl">{item.emoji}</span>
                <p className="text-sm font-semibold">~1/3</p>
                <p className="text-xs font-medium">{item.label}</p>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {item.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="overflow-hidden rounded-lg border">
          <Image
            src="https://farmsteadmeats.com.au/cdn/shop/files/FarmersPick_Feb26_EighthCow_WEB.jpg?v=1773641206&width=990"
            alt="Example 1/8th beef share from another butcher, for illustration only"
            width={990}
            height={660}
            className="w-full"
            unoptimized
          />
          <p className="bg-muted/50 px-3 py-2 text-center text-[11px] text-muted-foreground">
            For illustration only — image from{" "}
            <a
              href="https://farmsteadmeats.com.au"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Farmstead Meats
            </a>{" "}
            showing the volume of a 1/8th share.
          </p>
        </div>
      </section>

      {/* ── Bones & Tallow ── */}
      <Card className="border-earth/20 bg-earth-light/30">
        <CardContent className="flex gap-3 p-4">
          <Bone className="mt-0.5 h-5 w-5 shrink-0 text-earth" />
          <div>
            <h3 className="text-sm font-semibold">Bones &amp; Tallow</h3>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
              All bones go to stock and all fat to tallow. If you&apos;d like
              some bones for a furry friend or a jar of tallow for the kitchen,
              just add a note to your order.
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* ── The Numbers ── */}
      <section>
        <h2 className="mb-2 text-lg font-bold">The Numbers</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Here&apos;s where the money goes. The butcher charges a flat fee plus
          a per-kilo rate on the dressed weight, so the final price depends on
          how big the animal is. Drag the slider to see how it works out.
        </p>
        <CostCalculator
          expenses={expenses}
          hangingWeight={
            status?.hanging_weight_kg
              ? Number(status.hanging_weight_kg)
              : null
          }
        />
      </section>

      <Separator />

      {/* ── Good to Know ── */}
      <section>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Good to Know</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium">Shelf life</p>
              <p className="text-sm text-muted-foreground">
                Vacuum-sealed beef keeps for 12+ months in the freezer. No rush
                to get through it.
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium">Custom requests</p>
              <p className="text-sm text-muted-foreground">
                Every share gets the same cuts. If you have a preference or want
                to work something out, drop a suggestion on your order page.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* ── Where We're At ── */}
      <section>
        <h2 className="mb-4 text-lg font-bold">Where We&apos;re At</h2>

        {status && (
          <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
            {status.est_sacrifice_date && (
              <div className="rounded-md bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">Processing Date</p>
                <p className="font-medium">
                  {format(
                    new Date(status.est_sacrifice_date),
                    "d MMM yyyy"
                  )}
                </p>
              </div>
            )}
            {status.hanging_weight_kg && (
              <div className="rounded-md bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">Hanging Weight</p>
                <p className="font-medium">{status.hanging_weight_kg} kg</p>
              </div>
            )}
            {status.est_raw_pickup && (
              <div className="rounded-md bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">Raw Pickup</p>
                <p className="font-medium">
                  {format(new Date(status.est_raw_pickup), "d MMM yyyy")}
                </p>
              </div>
            )}
            {status.est_smoked_pickup && (
              <div className="rounded-md bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">Smoked Pickup</p>
                <p className="font-medium">
                  {format(new Date(status.est_smoked_pickup), "d MMM yyyy")}
                </p>
              </div>
            )}
          </div>
        )}

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
      </section>

      <Separator />

      {/* ── CTAs ── */}
      <section className="flex flex-col gap-3">
        <Link href="/my-order">
          <Button
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            size="lg"
          >
            {claimedSlots.length < 8 ? "Claim Your Share" : "View My Order"}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </section>

    </div>
  );
}

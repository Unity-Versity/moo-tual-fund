import { getSession } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, Beef, Users, Leaf, Heart } from "lucide-react";
import Link from "next/link";

export default async function HomePage() {
  const session = await getSession();

  const displayName =
    session?.type === "household" ? session.household_name : null;

  return (
    <div className="flex flex-col gap-8">
      {/* ── Welcome ── */}
      <section>
        <h1 className="text-2xl font-bold">
          {displayName ? `Hey ${displayName}` : "Hey"} 👋
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Friends splitting whole animals from local farms. No middlemen, no markup.
        </p>
      </section>

      {/* ── How It Works ── */}
      <section>
        <h2 className="mb-3 text-lg font-bold">How It Works</h2>
        <div className="grid gap-3">
          {[
            {
              icon: Beef,
              title: "We source whole animals",
              desc: "Beef, lamb, pork — direct from local farmers.",
            },
            {
              icon: Users,
              title: "You claim a share",
              desc: "Pick your size, choose your prep options.",
            },
            {
              icon: Heart,
              title: "You save",
              desc: "Bulk pricing, vacuum-sealed, freezer-ready.",
            },
          ].map((item) => (
            <Card key={item.title}>
              <CardContent className="flex gap-3 p-4">
                <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* ── What You Get ── */}
      <section>
        <h2 className="mb-3 text-lg font-bold">What You Get</h2>
        <div className="grid grid-cols-3 gap-3">
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
        <p className="mt-3 text-sm text-muted-foreground">
          Same proportional split per share. Keeps 12+ months frozen.
        </p>
      </section>

      <Separator />

      {/* ── Supporting Local ── */}
      <Card className="border-earth/20 bg-earth-light/30">
        <CardContent className="flex gap-3 p-4">
          <Leaf className="mt-0.5 h-5 w-5 shrink-0 text-earth" />
          <div>
            <h3 className="text-sm font-semibold">Supporting Local</h3>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
              Full traceability — farm, producer, and processor.
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* ── CTA ── */}
      <section className="flex flex-col gap-3">
        <Link href="/offers">
          <Button
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            size="lg"
          >
            View Current Offers
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </section>
    </div>
  );
}

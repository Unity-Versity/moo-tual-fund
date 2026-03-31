import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Minus } from "lucide-react";
import type { Cut, PrepOption, SlotCut, Slot } from "@/lib/types";

const CATEGORY_ORDER = ["steak", "roast", "slow_cook", "mince", "other", "smoked"];
const CATEGORY_LABELS: Record<string, string> = {
  steak: "Steaks",
  roast: "Roasts",
  slow_cook: "Slow Cook",
  mince: "Mince & Ground",
  other: "Other Cuts",
  smoked: "Smoked",
};

type SlotCutWithRels = SlotCut & {
  cut: Cut;
  prep_option: PrepOption | null;
};

type SlotWithRels = Slot & {
  household: { name: string } | null;
  slot_cuts: SlotCutWithRels[];
};

async function getData() {
  await requireAdmin();
  const supabase = await createServerSupabaseClient();

  const { data: slots } = await supabase
    .from("slots")
    .select(
      "*, household:households(name), slot_cuts:slot_cuts(*, cut:cuts(*), prep_option:prep_options(*))"
    )
    .eq("is_claimed", true)
    .order("slot_number");

  return (slots ?? []) as SlotWithRels[];
}

export default async function AdminOrdersPage() {
  const slots = await getData();

  if (slots.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No slots claimed yet. Orders will appear here once households claim shares.
      </p>
    );
  }

  // Group slots by household
  const byHousehold = new Map<
    string,
    { name: string; slots: SlotWithRels[] }
  >();
  for (const slot of slots) {
    const id = slot.household_id ?? slot.id;
    const name = slot.household?.name ?? `Slot ${slot.slot_number}`;
    if (!byHousehold.has(id)) {
      byHousehold.set(id, { name, slots: [] });
    }
    byHousehold.get(id)!.slots.push(slot);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold">All Orders</h2>
        <p className="text-sm text-muted-foreground">
          Every household&apos;s prep selections at a glance.
        </p>
      </div>

      {Array.from(byHousehold.entries()).map(([id, { name, slots: hSlots }]) => {
        // Merge all slot_cuts across this household's slots
        const allCuts = hSlots.flatMap((s) => s.slot_cuts);

        // Group by category
        const grouped = CATEGORY_ORDER.map((cat) => ({
          category: cat,
          label: CATEGORY_LABELS[cat] ?? cat,
          items: allCuts
            .filter((sc) => sc.cut.category === cat)
            .sort((a, b) => {
              if (a.cut.display_order !== b.cut.display_order)
                return a.cut.display_order - b.cut.display_order;
              return a.portion_number - b.portion_number;
            }),
        })).filter((g) => g.items.length > 0);

        const totalSelected = allCuts.filter(
          (sc) => sc.selected_prep_option_id
        ).length;
        const totalProcessable = allCuts.filter(
          (sc) => sc.cut.is_processable
        ).length;

        return (
          <Card key={id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  {name}
                  <Badge variant="secondary" className="text-xs">
                    {hSlots.length} share{hSlots.length > 1 ? "s" : ""}
                  </Badge>
                </span>
                {totalProcessable > 0 && (
                  <Badge
                    variant={
                      totalSelected === totalProcessable
                        ? "default"
                        : "outline"
                    }
                    className="text-xs"
                  >
                    {totalSelected}/{totalProcessable} selected
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {grouped.map((group) => (
                <div key={group.category}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((sc) => (
                      <div
                        key={sc.id}
                        className="flex items-center justify-between gap-2 rounded bg-secondary/50 px-2 py-1"
                      >
                        <span className="text-xs font-medium">
                          {sc.cut.name}
                          {sc.cut.portions_per_slot > 1 && (
                            <span className="text-muted-foreground ml-1">
                              #{sc.portion_number}
                            </span>
                          )}
                        </span>
                        {sc.cut.is_processable ? (
                          sc.prep_option ? (
                            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                              <Check className="h-3 w-3" />
                              {sc.prep_option.label}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                              <Minus className="h-3 w-3" />
                              Not chosen
                            </span>
                          )
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateCutTotalWeight } from "../../../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const CATEGORY_ORDER = ["steak", "roast", "slow_cook", "mince", "other", "smoked"];
const CATEGORY_LABELS: Record<string, string> = {
  steak: "Steaks",
  roast: "Roasts",
  slow_cook: "Slow Cook",
  mince: "Mince & Ground",
  other: "Other Cuts",
  smoked: "Smoked",
};

interface AnimalData {
  id: string;
  animal_number: number;
  hanging_weight_kg: number | null;
}

interface CutWithWeight {
  id: string;
  name: string;
  category: string;
  portions_per_slot: number;
  total_weight: number | null;
}

export default function AdminOfferWeightsPage() {
  const params = useParams();
  const offerId = params.offerId as string;

  const [animals, setAnimals] = useState<AnimalData[]>([]);
  const [cutsByAnimal, setCutsByAnimal] = useState<Map<string, CutWithWeight[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const [animalsRes, cutsRes, slotsRes, slotCutsRes] = await Promise.all([
        supabase.from("offer_animals").select("id, animal_number, hanging_weight_kg").eq("offer_id", offerId).order("animal_number"),
        supabase.from("offer_cuts").select("id, name, category, portions_per_slot, display_order").eq("offer_id", offerId).order("display_order"),
        supabase.from("offer_slots").select("id, animal_id, is_claimed").eq("offer_id", offerId).eq("is_claimed", true),
        supabase.from("offer_slot_cuts").select("id, cut_id, actual_weight_kg, slot_id"),
      ]);

      const animalsData = (animalsRes.data ?? []) as AnimalData[];
      const cutsData = cutsRes.data ?? [];
      const slotsData = slotsRes.data ?? [];
      const slotCutsData = slotCutsRes.data ?? [];

      // Map slot_id -> animal_id
      const slotToAnimal = new Map<string, string>();
      slotsData.forEach((s) => slotToAnimal.set(s.id, s.animal_id));

      // Build cuts-per-animal with aggregated weights
      const result = new Map<string, CutWithWeight[]>();

      for (const animal of animalsData) {
        const animalSlotIds = slotsData
          .filter((s) => s.animal_id === animal.id)
          .map((s) => s.id);

        const animalCuts: CutWithWeight[] = cutsData.map((cut) => {
          const cutSlotCuts = slotCutsData.filter(
            (sc) => sc.cut_id === cut.id && animalSlotIds.includes(sc.slot_id)
          );
          const totalWeight = cutSlotCuts.every((sc) => sc.actual_weight_kg == null)
            ? null
            : cutSlotCuts.reduce(
                (sum, sc) => sum + (Number(sc.actual_weight_kg) || 0),
                0
              );

          return {
            id: cut.id,
            name: cut.name,
            category: cut.category,
            portions_per_slot: cut.portions_per_slot,
            total_weight: totalWeight,
          };
        });

        result.set(animal.id, animalCuts);
      }

      setAnimals(animalsData);
      setCutsByAnimal(result);
      setLoading(false);
    }
    load();
  }, [offerId]);

  function handleWeightChange(animalId: string, cutId: string, value: string) {
    const totalWeight = value === "" ? null : Number(value);
    if (value !== "" && isNaN(totalWeight!)) return;

    const key = `${animalId}-${cutId}`;
    startTransition(async () => {
      const result = await updateCutTotalWeight(offerId, cutId, animalId, totalWeight);
      if (result.error) {
        toast.error(result.error);
      } else {
        // Update local state
        setCutsByAnimal((prev) => {
          const next = new Map(prev);
          const animalCuts = [...(next.get(animalId) ?? [])];
          const idx = animalCuts.findIndex((c) => c.id === cutId);
          if (idx >= 0) {
            animalCuts[idx] = { ...animalCuts[idx], total_weight: totalWeight };
          }
          next.set(animalId, animalCuts);
          return next;
        });
        setSavedKeys((prev) => new Set(prev).add(key));
        setTimeout(() => {
          setSavedKeys((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        }, 2000);
      }
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/admin/offers" className="hover:text-foreground">Offers</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/admin/offers/${offerId}`} className="hover:text-foreground">Manage</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Weights</span>
      </div>

      <div>
        <h2 className="text-lg font-bold">Weights by Cut</h2>
        <p className="text-sm text-muted-foreground">
          Enter the <strong>total</strong> weight for each cut per animal.
          It&apos;ll be split evenly across that animal&apos;s claimed slots.
        </p>
      </div>

      {animals.map((animal) => {
        const animalCuts = cutsByAnimal.get(animal.id) ?? [];

        const grouped = CATEGORY_ORDER.map((cat) => ({
          category: cat,
          label: CATEGORY_LABELS[cat] ?? cat,
          items: animalCuts.filter((c) => c.category === cat),
        })).filter((g) => g.items.length > 0);

        return (
          <div key={animal.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold">
                Animal {animal.animal_number} of {animals.length}
              </h3>
              {animal.hanging_weight_kg && (
                <Badge variant="outline" className="text-xs">
                  {animal.hanging_weight_kg}kg hanging
                </Badge>
              )}
            </div>

            {grouped.map((group) => (
              <div key={`${animal.id}-${group.category}`} className="space-y-1.5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {group.label}
                </h4>
                {group.items.map((cut) => {
                  const key = `${animal.id}-${cut.id}`;
                  const isSaved = savedKeys.has(key);

                  return (
                    <Card key={key}>
                      <CardContent className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{cut.name}</p>
                          {cut.total_weight != null && (
                            <p className="text-xs text-muted-foreground">
                              Total: {cut.total_weight.toFixed(2)}kg
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isSaved && (
                            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                          )}
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="—"
                            defaultValue={cut.total_weight ?? ""}
                            onBlur={(e) => handleWeightChange(animal.id, cut.id, e.target.value)}
                            className="w-24 text-right text-sm"
                            disabled={isPending}
                          />
                          <span className="text-xs text-muted-foreground">kg</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })}

      {isPending && (
        <p className="text-center text-xs text-muted-foreground animate-pulse">
          Saving...
        </p>
      )}
    </div>
  );
}

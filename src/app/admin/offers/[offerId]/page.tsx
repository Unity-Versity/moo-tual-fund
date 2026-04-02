"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OFFER_STAGES, STAGE_LABELS } from "@/lib/types";
import type { Offer, OfferStage, OfferAnimal } from "@/lib/types";
import { updateOfferStatus, updateAnimalWeight, updateOfferAnimalCount, toggleWeightsConfirmed } from "../../actions";
import { toast } from "sonner";
import { Loader2, Save, Plus, Minus, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const ADMIN_SUB_LINKS = [
  { href: "cuts", label: "Cuts" },
  { href: "weights", label: "Weights" },
  { href: "orders", label: "Orders" },
  { href: "expenses", label: "Expenses" },
  { href: "payments", label: "Payments" },
];

export default function AdminOfferDetailPage() {
  const params = useParams();
  const offerId = params.offerId as string;

  const [offer, setOffer] = useState<Offer | null>(null);
  const [animals, setAnimals] = useState<OfferAnimal[]>([]);
  const [stage, setStage] = useState<OfferStage>("purchased");
  const [status, setStatus] = useState<string>("open");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("offers").select("*").eq("id", offerId).single(),
      supabase.from("offer_animals").select("*").eq("offer_id", offerId).order("animal_number"),
    ]).then(([offerRes, animalsRes]) => {
      if (offerRes.data) {
        const o = offerRes.data as Offer;
        setOffer(o);
        setStage(o.stage);
        setStatus(o.status);
      }
      if (animalsRes.data) setAnimals(animalsRes.data as OfferAnimal[]);
    });
  }, [offerId]);

  function handleStatusSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("stage", stage);
    formData.set("status", status);

    startTransition(async () => {
      const result = await updateOfferStatus(offerId, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Status updated!");
      }
    });
  }

  function handleAnimalWeight(animalId: string, field: "hanging" | "takeHome", value: string) {
    const numVal = value === "" ? null : Number(value);
    if (value !== "" && isNaN(numVal!)) return;

    const animal = animals.find((a) => a.id === animalId);
    if (!animal) return;

    startTransition(async () => {
      const result = await updateAnimalWeight(
        animalId,
        field === "hanging" ? numVal : animal.hanging_weight_kg,
        field === "takeHome" ? numVal : animal.total_take_home_kg
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        setAnimals((prev) =>
          prev.map((a) =>
            a.id === animalId
              ? {
                  ...a,
                  hanging_weight_kg: field === "hanging" ? numVal : a.hanging_weight_kg,
                  total_take_home_kg: field === "takeHome" ? numVal : a.total_take_home_kg,
                }
              : a
          )
        );
        toast.success("Weight saved!");
      }
    });
  }

  function handleAnimalCountChange(delta: number) {
    if (!offer) return;
    const newCount = offer.animal_count + delta;
    if (newCount < 1) return;

    startTransition(async () => {
      const result = await updateOfferAnimalCount(offerId, newCount);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Animal count updated to ${newCount}!`);
        // Reload
        const supabase = createClient();
        const [offerRes, animalsRes] = await Promise.all([
          supabase.from("offers").select("*").eq("id", offerId).single(),
          supabase.from("offer_animals").select("*").eq("offer_id", offerId).order("animal_number"),
        ]);
        if (offerRes.data) {
          const o = offerRes.data as Offer;
          setOffer(o);
          setStage(o.stage);
          setStatus(o.status);
        }
        if (animalsRes.data) setAnimals(animalsRes.data as OfferAnimal[]);
      }
    });
  }

  function handleToggleWeights() {
    if (!offer) return;
    startTransition(async () => {
      const result = await toggleWeightsConfirmed(offerId, !offer.weights_confirmed);
      if (result.error) {
        toast.error(result.error);
      } else {
        setOffer((prev) => prev ? { ...prev, weights_confirmed: !prev.weights_confirmed } : prev);
        toast.success(offer.weights_confirmed ? "Weights set to estimated" : "Weights confirmed!");
      }
    });
  }

  if (!offer) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/admin/offers" className="hover:text-foreground">Offers</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{offer.title}</span>
      </div>

      {/* Sub-navigation */}
      <nav className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {ADMIN_SUB_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={`/admin/offers/${offerId}/${href}`}
            className="flex shrink-0 items-center rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Status Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Offer Status</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleStatusSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select value={stage} onValueChange={(v) => v && setStage(v as OfferStage)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OFFER_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STAGE_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="est_sacrifice_date">Processing Date</Label>
              <Input
                type="date"
                name="est_sacrifice_date"
                defaultValue={offer.est_sacrifice_date ?? ""}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="est_raw_pickup">Raw Pickup</Label>
                <Input
                  type="date"
                  name="est_raw_pickup"
                  defaultValue={offer.est_raw_pickup ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="est_smoked_pickup">Smoked Pickup</Label>
                <Input
                  type="date"
                  name="est_smoked_pickup"
                  defaultValue={offer.est_smoked_pickup ?? ""}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="banner_message">Banner Message</Label>
              <Textarea
                name="banner_message"
                defaultValue={offer.banner_message ?? ""}
                placeholder="What's the latest? Shows on the offer page."
                className="min-h-[80px]"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Animal Count */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Animals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium">
                {offer.animal_count} animal{offer.animal_count > 1 ? "s" : ""} &bull;{" "}
                {offer.share_size} shares &bull;{" "}
                {offer.total_slots} total slots
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleAnimalCountChange(-1)}
                disabled={isPending || offer.animal_count <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-lg font-bold tabular-nums w-8 text-center">
                {offer.animal_count}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleAnimalCountChange(1)}
                disabled={isPending}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Weights confirmed toggle */}
          <div className="flex items-center justify-between rounded-md border p-3 mb-4">
            <div>
              <p className="text-sm font-medium">Weights Confirmed</p>
              <p className="text-xs text-muted-foreground">
                {offer.weights_confirmed
                  ? "Weights are final — no more (est.) labels"
                  : "Weights show as estimated throughout the app"}
              </p>
            </div>
            <Button
              variant={offer.weights_confirmed ? "default" : "outline"}
              size="sm"
              onClick={handleToggleWeights}
              disabled={isPending}
            >
              {offer.weights_confirmed ? "Confirmed" : "Estimated"}
            </Button>
          </div>

          {/* Per-animal weights */}
          <div className="space-y-3">
            {animals.map((animal) => (
              <div key={animal.id} className="rounded-md border p-3">
                <p className="text-sm font-semibold mb-2">
                  Animal {animal.animal_number} of {offer.animal_count}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Hanging Weight (kg)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 160"
                      defaultValue={animal.hanging_weight_kg ?? ""}
                      onBlur={(e) => handleAnimalWeight(animal.id, "hanging", e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Take-Home (kg)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 105"
                      defaultValue={animal.total_take_home_kg ?? ""}
                      onBlur={(e) => handleAnimalWeight(animal.id, "takeHome", e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

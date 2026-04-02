"use client";

import { useEffect, useState, useTransition, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, Check, ChevronRight } from "lucide-react";
import { addCut, deleteCut, addPrepOption, deletePrepOption, updateCutEstWeight } from "../../../actions";
import type { OfferCut, OfferPrepOption } from "@/lib/types";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const CATEGORIES = [
  { value: "steak", label: "🥩 Steak" },
  { value: "roast", label: "🍖 Roast" },
  { value: "mince", label: "🫕 Mince" },
  { value: "slow_cook", label: "🍲 Slow Cook" },
  { value: "smoked", label: "🔥 Smoked" },
  { value: "other", label: "🦴 Other" },
];

export default function AdminOfferCutsPage() {
  const params = useParams();
  const offerId = params.offerId as string;

  const [cuts, setCuts] = useState<(OfferCut & { prep_options: OfferPrepOption[] })[]>([]);
  const [totalSlots, setTotalSlots] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [addingPrepFor, setAddingPrepFor] = useState<string | null>(null);
  const [category, setCategory] = useState("steak");
  const [isProcessable, setIsProcessable] = useState("false");
  const [savedCutIds, setSavedCutIds] = useState<Set<string>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);

  const loadCuts = useCallback(() => {
    const supabase = createClient();
    supabase
      .from("offer_cuts")
      .select("*, prep_options:offer_prep_options(*)")
      .eq("offer_id", offerId)
      .order("display_order")
      .then(({ data }) => {
        if (data) setCuts(data as (OfferCut & { prep_options: OfferPrepOption[] })[]);
      });
  }, [offerId]);

  useEffect(() => {
    loadCuts();
    const supabase = createClient();
    supabase
      .from("offers")
      .select("total_slots")
      .eq("id", offerId)
      .single()
      .then(({ data }) => {
        if (data) setTotalSlots(data.total_slots);
      });
  }, [loadCuts, offerId]);

  function handleAddCut(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("category", category);
    formData.set("is_processable", isProcessable);

    // Convert total weight to per-slot weight
    const totalWeight = Number(formData.get("total_weight"));
    formData.delete("total_weight");
    formData.set("est_weight_per_slot_kg", String(totalWeight / totalSlots));

    startTransition(async () => {
      const result = await addCut(offerId, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Cut added!");
        formRef.current?.reset();
        setCategory("steak");
        setIsProcessable("false");
        loadCuts();
      }
    });
  }

  function handleDeleteCut(id: string) {
    startTransition(async () => {
      const result = await deleteCut(offerId, id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Cut removed.");
        loadCuts();
      }
    });
  }

  function handleAddPrepOption(formData: FormData) {
    startTransition(async () => {
      const result = await addPrepOption(offerId, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Prep option added!");
        setAddingPrepFor(null);
        loadCuts();
      }
    });
  }

  function handleDeletePrepOption(id: string) {
    startTransition(async () => {
      const result = await deletePrepOption(offerId, id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Prep option removed.");
        loadCuts();
      }
    });
  }

  function handleWeightEdit(cutId: string, value: string) {
    const totalWeight = value === "" ? null : Number(value);
    if (totalWeight == null || isNaN(totalWeight)) return;

    const perSlot = totalWeight / totalSlots;

    startTransition(async () => {
      const result = await updateCutEstWeight(offerId, cutId, perSlot);
      if (result.error) {
        toast.error(result.error);
      } else {
        setCuts((prev) =>
          prev.map((c) =>
            c.id === cutId ? { ...c, est_weight_per_slot_kg: perSlot } : c
          )
        );
        setSavedCutIds((prev) => new Set(prev).add(cutId));
        setTimeout(() => {
          setSavedCutIds((prev) => {
            const next = new Set(prev);
            next.delete(cutId);
            return next;
          });
        }, 2000);
      }
    });
  }

  const totalWeightPerSlot = cuts.reduce((s, c) => s + Number(c.est_weight_per_slot_kg), 0);

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/admin/offers" className="hover:text-foreground">Offers</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/admin/offers/${offerId}`} className="hover:text-foreground">Manage</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Cuts</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Cut</CardTitle>
        </CardHeader>
        <CardContent>
          <form ref={formRef} onSubmit={handleAddCut} className="space-y-3">
            <div className="space-y-2">
              <Label>Cut Name</Label>
              <Input name="name" placeholder="e.g. Rump Steak" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Total Weight (kg)</Label>
                <Input type="number" step="0.1" name="total_weight" placeholder="e.g. 16" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Portions per Slot</Label>
                <Input type="number" name="portions_per_slot" defaultValue="1" min="1" />
              </div>
              <div className="space-y-2">
                <Label>Has Prep Options?</Label>
                <Select value={isProcessable} onValueChange={(v) => v && setIsProcessable(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">No</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Add Cut
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {cuts.length} cuts &bull; ~{totalWeightPerSlot.toFixed(1)}kg per slot &bull; ~{(totalWeightPerSlot * totalSlots).toFixed(1)}kg total
        </span>
      </div>

      <div className="space-y-3">
        {cuts.map((cut) => (
          <Card key={cut.id}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{cut.name}</p>
                    <Badge variant="outline" className="text-xs">
                      {CATEGORIES.find((c) => c.value === cut.category)?.label ?? cut.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {Number(cut.est_weight_per_slot_kg).toFixed(2)}kg/slot &bull;{" "}
                    {cut.portions_per_slot} portion{cut.portions_per_slot > 1 ? "s" : ""}
                    {cut.is_processable && " \u2022 Has prep options"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {savedCutIds.has(cut.id) && (
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  )}
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="—"
                    defaultValue={(Number(cut.est_weight_per_slot_kg) * totalSlots).toFixed(1)}
                    key={`${cut.id}-${totalSlots}`}
                    onBlur={(e) => handleWeightEdit(cut.id, e.target.value)}
                    className="w-20 text-right text-sm"
                    disabled={isPending}
                  />
                  <span className="text-xs text-muted-foreground">kg</span>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                    onClick={() => handleDeleteCut(cut.id)} disabled={isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {cut.is_processable && (
                <div className="mt-2 border-t pt-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Prep Options:</p>
                  <div className="space-y-1">
                    {cut.prep_options?.map((po) => (
                      <div key={po.id} className="flex items-center justify-between rounded bg-secondary px-2 py-1">
                        <span className="text-xs">
                          {po.label}
                          {Number(po.extra_cost) > 0 && (
                            <span className="text-muted-foreground"> (+${po.extra_cost})</span>
                          )}
                        </span>
                        <Button
                          variant="ghost" size="icon" className="h-5 w-5 text-destructive"
                          onClick={() => handleDeletePrepOption(po.id)} disabled={isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {addingPrepFor === cut.id ? (
                    <form action={handleAddPrepOption} className="mt-2 flex gap-2">
                      <input type="hidden" name="cut_id" value={cut.id} />
                      <Input name="label" placeholder="Label" className="h-7 text-xs" required />
                      <Input name="extra_cost" type="number" step="0.5" placeholder="$" className="h-7 w-16 text-xs" defaultValue="0" />
                      <Button type="submit" size="sm" className="h-7 text-xs" disabled={isPending}>Add</Button>
                    </form>
                  ) : (
                    <Button variant="ghost" size="sm" className="mt-1 h-6 text-xs" onClick={() => setAddingPrepFor(cut.id)}>
                      <Plus className="mr-1 h-3 w-3" />
                      Add Option
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {cuts.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No cuts defined yet. Time to get choppin&apos;! 🔪
          </p>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
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
import { Loader2, Plus, Trash2 } from "lucide-react";
import { addCut, deleteCut, addPrepOption, deletePrepOption } from "../actions";
import type { Cut, PrepOption } from "@/lib/types";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

const CATEGORIES = [
  { value: "steak", label: "🥩 Steak" },
  { value: "roast", label: "🍖 Roast" },
  { value: "mince", label: "🫕 Mince" },
  { value: "slow_cook", label: "🍲 Slow Cook" },
  { value: "smoked", label: "🔥 Smoked" },
  { value: "other", label: "🦴 Other" },
];

export default function AdminCutsPage() {
  const [cuts, setCuts] = useState<(Cut & { prep_options: PrepOption[] })[]>([]);
  const [isPending, startTransition] = useTransition();
  const [addingPrepFor, setAddingPrepFor] = useState<string | null>(null);

  function loadCuts() {
    const supabase = createClient();
    supabase
      .from("cuts")
      .select("*, prep_options(*)")
      .order("display_order")
      .then(({ data }) => {
        if (data) setCuts(data as (Cut & { prep_options: PrepOption[] })[]);
      });
  }

  useEffect(() => {
    loadCuts();
  }, []);

  function handleAddCut(formData: FormData) {
    startTransition(async () => {
      const result = await addCut(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Cut added!");
        loadCuts();
      }
    });
  }

  function handleDeleteCut(id: string) {
    startTransition(async () => {
      const result = await deleteCut(id);
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
      const result = await addPrepOption(formData);
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
      const result = await deletePrepOption(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Prep option removed.");
        loadCuts();
      }
    });
  }

  const totalWeight = cuts.reduce((s, c) => s + Number(c.est_weight_per_slot_kg), 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Cut</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleAddCut} className="space-y-3">
            <div className="space-y-2">
              <Label>Cut Name</Label>
              <Input name="name" placeholder="e.g. Rump Steak" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select name="category" defaultValue="steak">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Weight/Slot (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  name="est_weight_per_slot_kg"
                  placeholder="2.0"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Portions per Slot</Label>
                <Input
                  type="number"
                  name="portions_per_slot"
                  defaultValue="1"
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Has Prep Options?</Label>
                <Select name="is_processable" defaultValue="false">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">No</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add Cut
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {cuts.length} cuts &bull; ~{totalWeight.toFixed(1)}kg per slot
        </span>
      </div>

      <div className="space-y-3">
        {cuts.map((cut) => (
          <Card key={cut.id}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{cut.name}</p>
                    <Badge variant="outline" className="text-xs">
                      {CATEGORIES.find((c) => c.value === cut.category)?.label ?? cut.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {cut.est_weight_per_slot_kg}kg &bull;{" "}
                    {cut.portions_per_slot} portion{cut.portions_per_slot > 1 ? "s" : ""}
                    {cut.is_processable && " &bull; Has prep options"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => handleDeleteCut(cut.id)}
                  disabled={isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {cut.is_processable && (
                <div className="mt-2 border-t pt-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Prep Options:
                  </p>
                  <div className="space-y-1">
                    {cut.prep_options?.map((po) => (
                      <div
                        key={po.id}
                        className="flex items-center justify-between rounded bg-secondary px-2 py-1"
                      >
                        <span className="text-xs">
                          {po.label}
                          {po.extra_cost > 0 && (
                            <span className="text-muted-foreground">
                              {" "}(+${po.extra_cost})
                            </span>
                          )}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-destructive"
                          onClick={() => handleDeletePrepOption(po.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {addingPrepFor === cut.id ? (
                    <form
                      action={handleAddPrepOption}
                      className="mt-2 flex gap-2"
                    >
                      <input type="hidden" name="cut_id" value={cut.id} />
                      <Input
                        name="label"
                        placeholder="Label"
                        className="h-7 text-xs"
                        required
                      />
                      <Input
                        name="extra_cost"
                        type="number"
                        step="0.5"
                        placeholder="$"
                        className="h-7 w-16 text-xs"
                        defaultValue="0"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={isPending}
                      >
                        Add
                      </Button>
                    </form>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-6 text-xs"
                      onClick={() => setAddingPrepFor(cut.id)}
                    >
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

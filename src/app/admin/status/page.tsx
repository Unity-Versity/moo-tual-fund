"use client";

import { useEffect, useState, useTransition } from "react";
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
import { COW_STAGES, STAGE_LABELS } from "@/lib/types";
import type { CowStatus, CowStage } from "@/lib/types";
import { updateCowStatus } from "../actions";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AdminStatusPage() {
  const [status, setStatus] = useState<CowStatus | null>(null);
  const [stage, setStage] = useState<CowStage>("purchased");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("cow_status")
      .select("*")
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          setStatus(data as CowStatus);
          setStage((data as CowStatus).stage);
        }
      });
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("stage", stage);

    startTransition(async () => {
      const result = await updateCowStatus(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Status updated! The herd has been notified 🐄");
      }
    });
  }

  if (!status) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground animate-pulse">Loading status...</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Update Cow Status</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Current Stage</Label>
            <Select value={stage} onValueChange={(v) => v && setStage(v as CowStage)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COW_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="est_sacrifice_date">Est. Sacrifice Date</Label>
            <Input
              type="date"
              name="est_sacrifice_date"
              defaultValue={status.est_sacrifice_date ?? ""}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="hanging_weight_kg">Hanging Weight (kg)</Label>
              <Input
                type="number"
                step="0.1"
                name="hanging_weight_kg"
                defaultValue={status.hanging_weight_kg ?? ""}
                placeholder="e.g. 320"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_take_home_kg">Take-Home Weight (kg)</Label>
              <Input
                type="number"
                step="0.1"
                name="total_take_home_kg"
                defaultValue={status.total_take_home_kg ?? ""}
                placeholder="e.g. 210"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="est_raw_pickup">Est. Raw Pickup</Label>
              <Input
                type="date"
                name="est_raw_pickup"
                defaultValue={status.est_raw_pickup ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="est_smoked_pickup">Est. Smoked Pickup</Label>
              <Input
                type="date"
                name="est_smoked_pickup"
                defaultValue={status.est_smoked_pickup ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="banner_message">Banner Message</Label>
            <Textarea
              name="banner_message"
              defaultValue={status.banner_message ?? ""}
              placeholder="What's the latest moos? This shows at the top of every page."
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
  );
}

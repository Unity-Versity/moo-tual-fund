"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, ChevronRight } from "lucide-react";
import { createOffer } from "../actions";
import { createClient } from "@/lib/supabase/client";
import { ANIMAL_LABELS } from "@/lib/types";
import type { Offer } from "@/lib/types";
import { toast } from "sonner";
import Link from "next/link";

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isPending, startTransition] = useTransition();
  const [animalType, setAnimalType] = useState("beef");
  const [shareSize, setShareSize] = useState("1/4");
  const formRef = useRef<HTMLFormElement>(null);

  function loadOffers() {
    const supabase = createClient();
    supabase
      .from("offers")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setOffers(data as Offer[]);
      });
  }

  useEffect(() => {
    loadOffers();
  }, []);

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("animal_type", animalType);
    formData.set("share_size", shareSize);

    startTransition(async () => {
      const result = await createOffer(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Offer created with template cuts loaded!");
        formRef.current?.reset();
        setAnimalType("beef");
        setShareSize("1/4");
        loadOffers();
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create New Offer</CardTitle>
        </CardHeader>
        <CardContent>
          <form ref={formRef} onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input name="title" placeholder="e.g. April Beef Group Buy" required />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                name="description"
                placeholder="What's this offer about?"
                className="min-h-[60px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Animal Type</Label>
                <Select value={animalType} onValueChange={(v) => v && setAnimalType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beef">Beef</SelectItem>
                    <SelectItem value="lamb">Lamb</SelectItem>
                    <SelectItem value="pork">Pork</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Share Size</Label>
                <Select value={shareSize} onValueChange={(v) => v && setShareSize(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1/8">1/8 (eighths)</SelectItem>
                    <SelectItem value="1/4">1/4 (quarters)</SelectItem>
                    <SelectItem value="1/2">1/2 (halves)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Number of Animals</Label>
                <Input
                  type="number"
                  name="animal_count"
                  min="1"
                  defaultValue="1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Source (optional)</Label>
                <Input name="source_info" placeholder="e.g. Local farm, Gippsland" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Create Offer
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {offers.map((offer) => (
          <Link
            key={offer.id}
            href={`/admin/offers/${offer.id}`}
            className="block"
          >
            <Card className="transition-colors hover:border-primary/40">
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{offer.title}</p>
                    <Badge variant="outline" className="text-xs">{offer.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {ANIMAL_LABELS[offer.animal_type]} &bull;{" "}
                    {offer.animal_count} animal{offer.animal_count > 1 ? "s" : ""} &bull;{" "}
                    {offer.share_size} shares &bull;{" "}
                    {offer.total_slots} total slots
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}

        {offers.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No offers yet. Create one above to get started!
          </p>
        )}
      </div>
    </div>
  );
}

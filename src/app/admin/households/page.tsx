"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, RefreshCw, Copy, Check } from "lucide-react";
import { createHousehold, regeneratePin, toggleHousehold, getHouseholds } from "../actions";
import type { Household } from "@/lib/types";
import { toast } from "sonner";

export default function AdminHouseholdsPage() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [isPending, startTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function loadHouseholds() {
    getHouseholds().then((data) => {
      setHouseholds(data as Household[]);
    });
  }

  useEffect(() => {
    loadHouseholds();
  }, []);

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createHousehold(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Household created! PIN: ${result.pin}`);
        formRef.current?.reset();
        loadHouseholds();
      }
    });
  }

  function handleRegenerate(id: string) {
    startTransition(async () => {
      const result = await regeneratePin(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`New PIN: ${result.pin}`);
        loadHouseholds();
      }
    });
  }

  function handleToggle(id: string, active: boolean) {
    startTransition(async () => {
      const result = await toggleHousehold(id, active);
      if (result.error) {
        toast.error(result.error);
      } else {
        loadHouseholds();
      }
    });
  }

  async function copyPin(pin: string, id: string) {
    try {
      await navigator.clipboard.writeText(pin);
      setCopiedId(id);
      toast.success("PIN copied!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Couldn't copy — try selecting it manually");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Household</CardTitle>
        </CardHeader>
        <CardContent>
          <form ref={formRef} onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">Household Name</Label>
              <Input name="name" placeholder="e.g. The Smiths" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_info">Contact (optional)</Label>
              <Input
                name="contact_info"
                placeholder="Phone or email"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Create Household
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {households.map((h) => (
          <Card key={h.id} className={!h.is_active ? "opacity-60" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{h.name}</p>
                    {!h.is_active && (
                      <Badge variant="outline" className="text-xs">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  {h.contact_info && (
                    <p className="text-xs text-muted-foreground">
                      {h.contact_info}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggle(h.id, !h.is_active)}
                  disabled={isPending}
                  className="text-xs"
                >
                  {h.is_active ? "Deactivate" : "Activate"}
                </Button>
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-md bg-secondary p-2">
                <span className="text-xs text-muted-foreground">PIN:</span>
                <code className="flex-1 text-sm font-mono font-bold tracking-widest">
                  {h.pin_code}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => copyPin(h.pin_code, h.id)}
                >
                  {copiedId === h.id ? (
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleRegenerate(h.id)}
                  disabled={isPending}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {households.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No households yet. Time to round up the herd! 🐄
          </p>
        )}
      </div>
    </div>
  );
}

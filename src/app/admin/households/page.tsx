"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, RefreshCw, Copy, Check, Link as LinkIcon } from "lucide-react";
import { createHousehold, regenerateInvite, toggleHousehold, getHouseholds } from "../actions";
import type { Household } from "@/lib/types";
import { toast } from "sonner";

function getInviteUrl(token: string) {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/invite/${token}`;
}

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
        const url = getInviteUrl(result.invite_token!);
        await navigator.clipboard.writeText(url).catch(() => {});
        toast.success("Household created! Invite link copied.");
        formRef.current?.reset();
        loadHouseholds();
      }
    });
  }

  function handleRegenerateInvite(id: string) {
    startTransition(async () => {
      const result = await regenerateInvite(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        const url = getInviteUrl(result.invite_token!);
        await navigator.clipboard.writeText(url).catch(() => {});
        toast.success("New invite link generated and copied!");
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

  async function copyValue(value: string, id: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      toast.success("Copied!");
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
              <Input id="name" name="name" placeholder="e.g. The Smiths" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_info">Contact (optional)</Label>
              <Input
                id="contact_info"
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
              Create &amp; Copy Invite Link
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {households.map((h) => (
          <Card key={h.id} className={!h.is_active ? "opacity-80" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{h.name}</p>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        h.is_active
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-yellow-200 bg-yellow-50 text-yellow-700"
                      }`}
                    >
                      {h.is_active ? "Active" : "Pending"}
                    </Badge>
                  </div>
                  {h.contact_info && (
                    <p className="text-xs text-muted-foreground">
                      {h.contact_info}
                    </p>
                  )}
                </div>
                {h.is_active && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggle(h.id, false)}
                    disabled={isPending}
                    className="text-xs"
                  >
                    Deactivate
                  </Button>
                )}
              </div>

              {h.is_active && h.pin_code ? (
                <div className="mt-3 flex items-center gap-2 rounded-md bg-secondary p-2">
                  <span className="text-xs text-muted-foreground">PIN:</span>
                  <code className="flex-1 font-mono text-sm font-bold tracking-widest">
                    {h.pin_code}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Copy PIN"
                    className="h-7 w-7"
                    onClick={() => copyValue(h.pin_code!, `pin-${h.id}`)}
                  >
                    {copiedId === `pin-${h.id}` ? (
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 rounded-md bg-secondary p-2">
                    <LinkIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-xs text-muted-foreground">
                      {getInviteUrl(h.invite_token)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Copy invite link"
                      className="h-7 w-7"
                      onClick={() =>
                        copyValue(getInviteUrl(h.invite_token), `invite-${h.id}`)
                      }
                    >
                      {copiedId === `invite-${h.id}` ? (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Regenerate invite link"
                      className="h-7 w-7"
                      onClick={() => handleRegenerateInvite(h.id)}
                      disabled={isPending}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Send this link to {h.name} — they&apos;ll set their own PIN when they open it.
                  </p>
                </div>
              )}
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

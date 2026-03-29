"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { addPayment, deletePayment } from "../actions";
import type { Household, Payment } from "@/lib/types";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export default function AdminPaymentsPage() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [payments, setPayments] = useState<(Payment & { household?: { name: string } })[]>([]);
  const [isPending, startTransition] = useTransition();

  function loadData() {
    const supabase = createClient();
    Promise.all([
      supabase.from("households").select("*").eq("is_active", true).order("name"),
      supabase
        .from("payments")
        .select("*, household:households(name)")
        .order("payment_date", { ascending: false }),
    ]).then(([hRes, pRes]) => {
      if (hRes.data) setHouseholds(hRes.data as Household[]);
      if (pRes.data) setPayments(pRes.data as (Payment & { household: { name: string } })[]);
    });
  }

  useEffect(() => {
    loadData();
  }, []);

  const total = payments.reduce((s, p) => s + Number(p.amount), 0);

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      const result = await addPayment(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Payment recorded! 💰");
        loadData();
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deletePayment(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Payment removed.");
        loadData();
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Record Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleAdd} className="space-y-3">
            <div className="space-y-2">
              <Label>Household</Label>
              <Select name="household_id" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select household" />
                </SelectTrigger>
                <SelectContent>
                  {households.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  name="amount"
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  name="payment_date"
                  defaultValue={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select name="method" defaultValue="PayID">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PayID">PayID</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input name="notes" placeholder="e.g. Deposit" />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Record Payment
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">All Payments</CardTitle>
            <span className="text-sm font-bold text-green-600">
              ${total.toFixed(2)}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No payments yet. The coffers are empty! 🏜️
            </p>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-md border p-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {p.household?.name ?? "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.payment_date} &bull; {p.method}
                      {p.notes ? ` — ${p.notes}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-green-600">
                      +${Number(p.amount).toFixed(2)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(p.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

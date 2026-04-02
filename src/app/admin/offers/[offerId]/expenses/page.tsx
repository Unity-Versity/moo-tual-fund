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
import { Loader2, Plus, Trash2, ChevronRight, GripVertical } from "lucide-react";
import { addExpense, deleteExpense, reorderExpenses } from "../../../actions";
import type { Expense } from "@/lib/types";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const CATEGORIES = [
  "Animal Purchase",
  "Butcher Fees",
  "Processing (per kg)",
  "Smoking Supplies",
  "Transport",
  "Packaging",
  "Other",
];

export default function AdminOfferExpensesPage() {
  const params = useParams();
  const offerId = params.offerId as string;

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [category, setCategory] = useState("Animal Purchase");
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  const loadExpenses = useCallback(() => {
    const supabase = createClient();
    supabase
      .from("expenses")
      .select("*")
      .eq("offer_id", offerId)
      .order("display_order")
      .then(({ data }) => {
        if (data) setExpenses(data as Expense[]);
      });
  }, [offerId]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const fixedTotal = expenses
    .filter((e) => e.category !== "Processing (per kg)")
    .reduce((s, e) => s + Number(e.amount), 0);
  const processingRates = expenses
    .filter((e) => e.category === "Processing (per kg)")
    .reduce((s, e) => s + Number(e.amount), 0);

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("category", category);

    startTransition(async () => {
      const result = await addExpense(offerId, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Expense added!");
        formRef.current?.reset();
        setCategory("Animal Purchase");
        loadExpenses();
      }
    });
  }

  function handleDragEnd() {
    if (dragItem.current === null || dragOver.current === null) return;
    if (dragItem.current === dragOver.current) return;

    const reordered = [...expenses];
    const [moved] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOver.current, 0, moved);
    setExpenses(reordered);

    dragItem.current = null;
    dragOver.current = null;

    startTransition(async () => {
      const result = await reorderExpenses(
        offerId,
        reordered.map((e) => e.id)
      );
      if (result.error) toast.error(result.error);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteExpense(offerId, id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Expense removed.");
        loadExpenses();
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/admin/offers" className="hover:text-foreground">Offers</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/admin/offers/${offerId}`} className="hover:text-foreground">Manage</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Expenses</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Expense</CardTitle>
        </CardHeader>
        <CardContent>
          <form ref={formRef} onSubmit={handleAdd} className="space-y-3">
            <div className="space-y-2">
              <Label>Description</Label>
              <Input name="description" placeholder="e.g. Steer purchase" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{category === "Processing (per kg)" ? "Rate ($/kg)" : "Amount ($)"}</Label>
                <Input type="number" step="0.01" name="amount" placeholder={category === "Processing (per kg)" ? "e.g. 3.30" : "0.00"} required />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Add Expense
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">All Expenses</CardTitle>
            <span className="text-sm font-bold">
              ${fixedTotal.toFixed(2)}{processingRates > 0 && ` + $${processingRates.toFixed(2)}/kg`}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No expenses yet.</p>
          ) : (
            <div className="space-y-2">
              {expenses.map((e, i) => (
                <div
                  key={e.id}
                  draggable
                  onDragStart={() => { dragItem.current = i; }}
                  onDragEnter={() => { dragOver.current = i; }}
                  onDragEnd={handleDragEnd}
                  onDragOver={(ev) => ev.preventDefault()}
                  className="flex cursor-grab items-center justify-between rounded-md border p-2 active:cursor-grabbing"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{e.description}</p>
                      <Badge variant="outline" className="text-xs">{e.category}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {e.category === "Processing (per kg)" ? `$${Number(e.amount).toFixed(2)}/kg` : `$${Number(e.amount).toFixed(2)}`}
                    </span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(e.id)} disabled={isPending}>
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

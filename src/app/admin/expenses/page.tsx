"use client";

import { useEffect, useState, useTransition, useRef } from "react";
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
import { addExpense, deleteExpense } from "../actions";
import type { Expense } from "@/lib/types";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

const CATEGORIES = [
  "Animal Purchase",
  "Butcher Fees",
  "Smoking Supplies",
  "Transport",
  "Packaging",
  "Other",
];

export default function AdminExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [category, setCategory] = useState("Animal Purchase");
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function loadExpenses() {
    const supabase = createClient();
    supabase
      .from("expenses")
      .select("*")
      .order("created_at")
      .then(({ data }) => {
        if (data) setExpenses(data as Expense[]);
      });
  }

  useEffect(() => {
    loadExpenses();
  }, []);

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("category", category);

    startTransition(async () => {
      const result = await addExpense(formData);
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

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteExpense(id);
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
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
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
              Add Expense
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">All Expenses</CardTitle>
            <span className="text-sm font-bold">${total.toFixed(2)}</span>
          </div>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No expenses yet. Enjoy the free beef while it lasts! 😄
            </p>
          ) : (
            <div className="space-y-2">
              {expenses.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between rounded-md border p-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{e.description}</p>
                    <Badge variant="outline" className="text-xs">
                      {e.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      ${Number(e.amount).toFixed(2)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(e.id)}
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

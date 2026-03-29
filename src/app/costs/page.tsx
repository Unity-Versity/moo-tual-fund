import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Expense } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Receipt, Wallet } from "lucide-react";

async function getData() {
  const supabase = await createServerSupabaseClient();

  const [expensesRes, slotsRes] = await Promise.all([
    supabase.from("expenses").select("*").order("created_at"),
    supabase.from("slots").select("is_claimed"),
  ]);

  const claimedCount = (slotsRes.data ?? []).filter(
    (s: { is_claimed: boolean }) => s.is_claimed
  ).length;

  return {
    expenses: (expensesRes.data ?? []) as Expense[],
    claimedSlots: claimedCount,
  };
}

export default async function CostsPage() {
  const { expenses, claimedSlots } = await getData();

  const totalExpenses = expenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );
  const costPerSlot = claimedSlots > 0 ? totalExpenses / 8 : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Costs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything we&apos;ve spent so far.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center p-4 text-center">
            <Receipt className="mb-1 h-5 w-5 text-primary" />
            <p className="text-xl font-bold">${totalExpenses.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-4 text-center">
            <Wallet className="mb-1 h-5 w-5 text-accent" />
            <p className="text-xl font-bold">${costPerSlot.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Per Slot</p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No expenses logged yet.
            </p>
          ) : (
            <div className="space-y-2">
              {expenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">{e.description}</p>
                    <Badge variant="outline" className="text-xs">
                      {e.category}
                    </Badge>
                  </div>
                  <span className="text-sm font-semibold">
                    ${Number(e.amount).toFixed(2)}
                  </span>
                </div>
              ))}
              <Separator />
              <div className="flex items-center justify-between font-bold">
                <span className="text-sm">Total</span>
                <span className="text-sm">${totalExpenses.toFixed(2)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-primary">How to Pay</p>
          <p className="mt-1 text-sm text-muted-foreground">
            PayID transfer. Include your name in the description.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

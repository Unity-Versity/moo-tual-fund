import type { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CowStatus, Expense } from "@/lib/types";
import { splitExpenses, calcTotal } from "@/components/cost-calculator";

export const metadata: Metadata = {
  title: "Costs",
  description: "See how the money breaks down across all shares.",
};
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, Wallet } from "lucide-react";
import { CostCalculator } from "@/components/cost-calculator";

async function getData() {
  const supabase = await createServerSupabaseClient();

  const [statusRes, expensesRes] = await Promise.all([
    supabase.from("cow_status").select("*").limit(1).single(),
    supabase.from("expenses").select("*").order("created_at"),
  ]);

  return {
    status: statusRes.data as CowStatus | null,
    expenses: (expensesRes.data ?? []) as Expense[],
  };
}

export default async function CostsPage() {
  const { status, expenses } = await getData();

  const hangingWeight = status?.hanging_weight_kg
    ? Number(status.hanging_weight_kg)
    : null;
  const estimateWeight = hangingWeight ?? 150;

  const { fixed, processingRate } = splitExpenses(expenses);
  const { total } = calcTotal(fixed, processingRate, estimateWeight);
  const costPerSlot = total / 8;

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
            <p className="text-xl font-bold">${total.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">
              Total{!hangingWeight && " (est.)"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-4 text-center">
            <Wallet className="mb-1 h-5 w-5 text-accent" />
            <p className="text-xl font-bold">${costPerSlot.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">
              Per Slot{!hangingWeight && " (est.)"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Calculator */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <CostCalculator expenses={expenses} hangingWeight={hangingWeight} />
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

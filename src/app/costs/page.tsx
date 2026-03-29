import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Expense, Payment, Slot, Household } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Receipt, Users, Wallet } from "lucide-react";

async function getData() {
  const supabase = await createServerSupabaseClient();

  const [expensesRes, paymentsRes, slotsRes, householdsRes] = await Promise.all([
    supabase.from("expenses").select("*").order("created_at"),
    supabase.from("payments").select("*, household:households(name)").order("payment_date"),
    supabase.from("slots").select("*, household:households(id, name)").order("slot_number"),
    supabase.from("households_safe").select("*").eq("is_active", true),
  ]);

  return {
    expenses: (expensesRes.data ?? []) as Expense[],
    payments: (paymentsRes.data ?? []) as (Payment & { household: { name: string } })[],
    slots: (slotsRes.data ?? []) as (Slot & { household: { id: string; name: string } | null })[],
    households: (householdsRes.data ?? []) as Household[],
  };
}

export default async function CostsPage() {
  const { expenses, payments, slots, households } = await getData();

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const costPerSlot = totalExpenses / 8;

  // Build per-household ledger
  const householdLedger = households.map((h) => {
    const hSlots = slots.filter((s) => s.household?.id === h.id);
    const hPayments = payments.filter((p) => p.household_id === h.id);
    const totalPaid = hPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalOwed = costPerSlot * hSlots.length;

    return {
      household: h,
      slotCount: hSlots.length,
      totalOwed,
      totalPaid,
      balance: totalOwed - totalPaid,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">The Moo-ney Trail 💰</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Full transparency — every dollar tracked. No bull.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center p-4 text-center">
            <Receipt className="mb-1 h-5 w-5 text-primary" />
            <p className="text-xl font-bold">${totalExpenses.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Total Expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-4 text-center">
            <Wallet className="mb-1 h-5 w-5 text-accent" />
            <p className="text-xl font-bold">${costPerSlot.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Per Slot (1/8th)</p>
          </CardContent>
        </Card>
      </div>

      {/* Expense Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Expense Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No expenses logged yet. The boss is still counting pennies. 🤠
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

      {/* Household Ledger */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Who Owes What</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {householdLedger.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No households yet. The paddock is empty.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Household</TableHead>
                  <TableHead className="text-right text-xs">Slots</TableHead>
                  <TableHead className="text-right text-xs">Owed</TableHead>
                  <TableHead className="text-right text-xs">Paid</TableHead>
                  <TableHead className="text-right text-xs">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {householdLedger.map(({ household, slotCount, totalOwed, totalPaid, balance }) => (
                  <TableRow key={household.id}>
                    <TableCell className="text-sm font-medium">
                      {household.name}
                    </TableCell>
                    <TableCell className="text-right text-sm">{slotCount}</TableCell>
                    <TableCell className="text-right text-sm">
                      ${totalOwed.toFixed(0)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      ${totalPaid.toFixed(0)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold">
                      <span className={balance <= 0 ? "text-green-600" : "text-accent"}>
                        {balance <= 0 ? "Paid ✓" : `$${balance.toFixed(0)}`}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment Info */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-primary">How to Pay</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Transfer via PayID to the admin. Include your household name in the
            description so we can track it. Easy as!
          </p>
        </CardContent>
      </Card>

      {/* Recent Payments */}
      {payments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">
                      {p.household?.name ?? "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.payment_date} &bull; {p.method}
                      {p.notes ? ` — ${p.notes}` : ""}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-green-600">
                    +${Number(p.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

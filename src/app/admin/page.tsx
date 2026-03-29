import { createServerSupabaseClient } from "@/lib/supabase/server";
import { STAGE_LABELS } from "@/lib/types";
import type { CowStatus, Slot, Expense, Payment, Suggestion } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SuggestionActions } from "./suggestion-actions";

async function getData() {
  const supabase = await createServerSupabaseClient();

  const [statusRes, slotsRes, expensesRes, paymentsRes, suggestionsRes] =
    await Promise.all([
      supabase.from("cow_status").select("*").limit(1).single(),
      supabase.from("slots").select("*, household:households(name)"),
      supabase.from("expenses").select("*"),
      supabase.from("payments").select("*"),
      supabase.from("suggestions").select("*, household:households(name)").order("created_at", { ascending: false }),
    ]);

  return {
    status: statusRes.data as CowStatus | null,
    slots: (slotsRes.data ?? []) as (Slot & { household: { name: string } | null })[],
    expenses: (expensesRes.data ?? []) as Expense[],
    payments: (paymentsRes.data ?? []) as Payment[],
    suggestions: (suggestionsRes.data ?? []) as (Suggestion & { household: { name: string } })[],
  };
}

export default async function AdminPage() {
  const { status, slots, expenses, payments, suggestions } = await getData();

  const claimed = slots.filter((s) => s.is_claimed).length;
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalPayments = payments.reduce((s, p) => s + Number(p.amount), 0);
  const pendingSuggestions = suggestions.filter((s) => s.status === "pending");

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{claimed}/8</p>
            <p className="text-xs text-muted-foreground">Slots Claimed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">
              {status ? STAGE_LABELS[status.stage].split(" ").slice(0, 3).join(" ") : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Current Stage</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">${totalExpenses.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Total Expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">${totalPayments.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Total Collected</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Suggestions ({pendingSuggestions.length} pending)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {suggestions.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No suggestions from the herd yet. All quiet on the western front! 🌾
            </p>
          ) : (
            <SuggestionActions suggestions={suggestions} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

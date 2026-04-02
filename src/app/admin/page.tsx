import { createServerSupabaseClient } from "@/lib/supabase/server";
import { STAGE_LABELS, ANIMAL_LABELS } from "@/lib/types";
import type { Offer, OfferSlot, Expense, Payment, Suggestion } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { SuggestionActions } from "./suggestion-actions";
import Link from "next/link";

async function getData() {
  const supabase = await createServerSupabaseClient();

  const [offersRes, slotsRes, expensesRes, paymentsRes, suggestionsRes] =
    await Promise.all([
      supabase.from("offers").select("*").order("created_at", { ascending: false }),
      supabase.from("offer_slots").select("id, offer_id, is_claimed"),
      supabase.from("expenses").select("*"),
      supabase.from("payments").select("*"),
      supabase.from("suggestions").select("*, household:households(name)").order("created_at", { ascending: false }),
    ]);

  return {
    offers: (offersRes.data ?? []) as Offer[],
    slots: (slotsRes.data ?? []) as Pick<OfferSlot, "id" | "offer_id" | "is_claimed">[],
    expenses: (expensesRes.data ?? []) as Expense[],
    payments: (paymentsRes.data ?? []) as Payment[],
    suggestions: (suggestionsRes.data ?? []) as (Suggestion & { household: { name: string } })[],
  };
}

export default async function AdminPage() {
  const { offers, slots, expenses, payments, suggestions } = await getData();

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalPayments = payments.reduce((s, p) => s + Number(p.amount), 0);
  const pendingSuggestions = suggestions.filter((s) => s.status === "pending");

  return (
    <div className="flex flex-col gap-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{offers.length}</p>
            <p className="text-xs text-muted-foreground">Active Offers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">
              {slots.filter((s) => s.is_claimed).length}/{slots.length}
            </p>
            <p className="text-xs text-muted-foreground">Total Slots Claimed</p>
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

      {/* Offers List */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Offers</CardTitle>
            <Link
              href="/admin/offers"
              className="text-xs font-medium text-primary hover:underline"
            >
              Manage
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {offers.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No offers yet. Create one to get started!
            </p>
          ) : (
            offers.map((offer) => {
              const offerSlots = slots.filter((s) => s.offer_id === offer.id);
              const claimed = offerSlots.filter((s) => s.is_claimed).length;
              return (
                <Link
                  key={offer.id}
                  href={`/admin/offers/${offer.id}`}
                  className="flex items-center justify-between rounded-md border p-3 hover:bg-secondary/50 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{offer.title}</p>
                      <Badge variant="outline" className="text-xs">{offer.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {ANIMAL_LABELS[offer.animal_type]} &bull;{" "}
                      {claimed}/{offerSlots.length} claimed &bull;{" "}
                      {(STAGE_LABELS[offer.stage] ?? offer.stage).split(" ").slice(0, 3).join(" ")}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Suggestions */}
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

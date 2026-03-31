import type { Expense } from "@/lib/types";

export const PROCESSING_CATEGORY = "Processing (per kg)";

export function splitExpenses(expenses: Expense[]) {
  const fixed: Expense[] = [];
  let processingRate = 0;

  for (const e of expenses) {
    if (e.category === PROCESSING_CATEGORY) {
      processingRate += Number(e.amount);
    } else {
      fixed.push(e);
    }
  }

  return { fixed, processingRate };
}

export function calcTotal(
  fixedExpenses: Expense[],
  processingRate: number,
  weight: number
) {
  const fixedTotal = fixedExpenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );
  const processingCost = processingRate * weight;
  return { fixedTotal, processingCost, total: fixedTotal + processingCost };
}

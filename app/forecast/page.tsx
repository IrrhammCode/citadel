"use client";

import { useMemo } from "react";
import { PredictiveBudget } from "@/components/analytics/predictive-budget";
import type { SpendingRecord } from "@/components/analytics/predictive-budget";

// ── Sample Data ────────────────────────────────────────────────────

function generateSampleSpending(): SpendingRecord[] {
  const records: SpendingRecord[] = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Simulate a slightly increasing trend with some variance
    const baseSpend = 120 + (30 - i) * 3;
    const variance = Math.random() * 80 - 40;
    const amount = Math.max(20, baseSpend + variance);

    records.push({
      date: date.toISOString().slice(0, 10),
      amount: Math.round(amount * 100) / 100,
      category: "operations",
    });
  }

  return records;
}

// ── Page ───────────────────────────────────────────────────────────

export default function ForecastPage() {
  const spending = useMemo(() => generateSampleSpending(), []);
  const totalBudget = 5000;

  const periodLabel = useMemo(() => {
    const now = new Date();
    return `${now.toLocaleDateString("en-US", { month: "long", year: "numeric" })} Budget`;
  }, []);

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Budget Forecast</h1>
        <p className="mt-1 text-sm text-zinc-500">
          AI-powered spending predictions and budget analysis for your treasury.
        </p>
      </div>

      <PredictiveBudget
        spending={spending}
        totalBudget={totalBudget}
        periodLabel={periodLabel}
      />
    </main>
  );
}

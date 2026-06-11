"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Flame,
  Calendar,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
  Target,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Stagger, StaggerItem } from "@/components/motion/motion";

// ── Types ──────────────────────────────────────────────────────────

export type SpendingRecord = {
  date: string; // ISO date string
  amount: number;
  category?: string;
};

export type PredictiveBudgetProps = {
  /** Historical spending records */
  spending: SpendingRecord[];
  /** Total budget for the period */
  totalBudget: number;
  /** Budget period label (e.g. "June 2026") */
  periodLabel?: string;
  /** Optional className for the outer wrapper */
  className?: string;
};

// ── Helpers ────────────────────────────────────────────────────────

type Trend = "increasing" | "decreasing" | "stable";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCurrencyPrecise(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getDayDiff(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function computeAverages(spending: SpendingRecord[]) {
  if (spending.length === 0) return { daily: 0, weekly: 0, monthly: 0 };

  const sorted = [...spending].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const first = new Date(sorted[0].date);
  const last = new Date(sorted[sorted.length - 1].date);
  const totalDays = Math.max(getDayDiff(first, last), 1);
  const totalSpend = sorted.reduce((s, r) => s + r.amount, 0);

  const daily = totalSpend / totalDays;
  return {
    daily,
    weekly: daily * 7,
    monthly: daily * 30,
  };
}

function computeTrend(spending: SpendingRecord[]): Trend {
  if (spending.length < 4) return "stable";

  const sorted = [...spending].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // Split into two halves and compare averages
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);

  const avgFirst = firstHalf.reduce((s, r) => s + r.amount, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((s, r) => s + r.amount, 0) / secondHalf.length;

  const diff = (avgSecond - avgFirst) / avgFirst;
  if (diff > 0.1) return "increasing";
  if (diff < -0.1) return "decreasing";
  return "stable";
}

function computeProjection(
  spending: SpendingRecord[],
  totalBudget: number,
) {
  if (spending.length === 0)
    return {
      projected30Day: 0,
      burnRate: 0,
      daysRemaining: Infinity,
      willExceed: false,
      exceedDate: null as Date | null,
      recommendedAdjustment: 0,
      spentSoFar: 0,
      remaining: totalBudget,
      usagePercent: 0,
    };

  const sorted = [...spending].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const first = new Date(sorted[0].date);
  const last = new Date(sorted[sorted.length - 1].date);
  const totalDays = Math.max(getDayDiff(first, last), 1);
  const totalSpend = sorted.reduce((s, r) => s + r.amount, 0);

  const burnRate = totalSpend / totalDays; // per day
  const projected30Day = burnRate * 30;
  const remaining = totalBudget - totalSpend;
  const daysRemaining = burnRate > 0 ? remaining / burnRate : Infinity;
  const usagePercent = totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0;

  // Will budget be exceeded in the next 30 days?
  const willExceed = projected30Day > totalBudget;

  // When will it be exceeded?
  let exceedDate: Date | null = null;
  if (willExceed && burnRate > 0) {
    const daysUntilExceed = totalBudget / burnRate;
    exceedDate = new Date(last.getTime() + daysUntilExceed * 86400000);
  }

  // Recommended daily adjustment to stay within budget over 30 days
  const targetDailySpend = totalBudget / 30;
  const recommendedAdjustment = burnRate - targetDailySpend;

  return {
    projected30Day,
    burnRate,
    daysRemaining,
    willExceed,
    exceedDate,
    recommendedAdjustment,
    spentSoFar: totalSpend,
    remaining,
    usagePercent,
  };
}

// ── Sub-components ─────────────────────────────────────────────────

function TrendIcon({ trend }: { trend: Trend }) {
  const config = {
    increasing: {
      Icon: TrendingUp,
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      label: "Increasing",
    },
    decreasing: {
      Icon: TrendingDown,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      label: "Decreasing",
    },
    stable: {
      Icon: Minus,
      color: "text-zinc-400",
      bg: "bg-zinc-500/10",
      border: "border-zinc-500/30",
      label: "Stable",
    },
  };

  const { Icon, color, bg, border, label } = config[trend];

  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 border px-2.5 py-1", bg, border, color)}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Badge>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subtext,
  accent = "emerald",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext?: string;
  accent?: "emerald" | "red" | "amber" | "cyan" | "zinc";
}) {
  const accentMap = {
    emerald: "text-emerald-400 bg-emerald-500/10",
    red: "text-red-400 bg-red-500/10",
    amber: "text-amber-400 bg-amber-500/10",
    cyan: "text-cyan-400 bg-cyan-500/10",
    zinc: "text-zinc-400 bg-zinc-500/10",
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-emerald-500/10"
    >
      <div className="flex items-center gap-3">
        <div className={cn("rounded-lg p-2", accentMap[accent])}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-zinc-500">{label}</p>
          <motion.p
            key={value}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-lg font-bold text-zinc-100"
          >
            {value}
          </motion.p>
          {subtext && (
            <p className="mt-0.5 text-xs text-zinc-500">{subtext}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function BudgetGauge({
  usagePercent,
  willExceed,
}: {
  usagePercent: number;
  willExceed: boolean;
}) {
  const clamped = Math.min(usagePercent, 100);
  const color = willExceed
    ? "bg-red-500"
    : usagePercent > 80
      ? "bg-amber-500"
      : "bg-emerald-500";
  const glowColor = willExceed
    ? "shadow-red-500/30"
    : usagePercent > 80
      ? "shadow-amber-500/20"
      : "shadow-emerald-500/20";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-400">Budget Usage</span>
        <span
          className={cn(
            "font-mono font-semibold",
            willExceed
              ? "text-red-400"
              : usagePercent > 80
                ? "text-amber-400"
                : "text-emerald-400",
          )}
        >
          {usagePercent.toFixed(1)}%
        </span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-zinc-800">
        <motion.div
          className={cn("absolute inset-y-0 left-0 rounded-full shadow-lg", color, glowColor)}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
        {/* Threshold markers */}
        <div
          className="absolute inset-y-0 w-px bg-amber-500/40"
          style={{ left: "80%" }}
        />
        <div
          className="absolute inset-y-0 w-px bg-red-500/40"
          style={{ left: "100%" }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-zinc-600">
        <span>0%</span>
        <span className="text-amber-600">80%</span>
        <span className="text-red-600">100%</span>
      </div>
    </div>
  );
}

function WarningBanner({
  willExceed,
  exceedDate,
  recommendedAdjustment,
  burnRate,
}: {
  willExceed: boolean;
  exceedDate: Date | null;
  recommendedAdjustment: number;
  burnRate: number;
}) {
  if (!willExceed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4"
      >
        <div className="rounded-full bg-emerald-500/10 p-2">
          <Target className="h-4 w-4 text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-emerald-400">
            Budget on track
          </p>
          <p className="text-xs text-zinc-400">
            Current spending rate is within budget limits.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="space-y-3 rounded-lg border border-red-500/20 bg-red-500/5 p-4"
    >
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="rounded-full bg-red-500/10 p-2"
        >
          <AlertTriangle className="h-4 w-4 text-red-400" />
        </motion.div>
        <div>
          <p className="text-sm font-semibold text-red-400">
            Budget will be exceeded
          </p>
          <p className="text-xs text-zinc-400">
            {exceedDate
              ? `Projected to exceed on ${exceedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
              : "At current rate, budget will be exceeded."}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            Recommended daily adjustment
          </span>
          <span className="flex items-center gap-1 text-sm font-bold text-amber-400">
            <ArrowDownRight className="h-3.5 w-3.5" />
            {formatCurrencyPrecise(recommendedAdjustment)}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-zinc-500">
          Reduce daily spend from {formatCurrencyPrecise(burnRate)} to{" "}
          {formatCurrencyPrecise(burnRate - recommendedAdjustment)} to stay
          within budget.
        </p>
      </div>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export function PredictiveBudget({
  spending,
  totalBudget,
  periodLabel = "Current Period",
  className,
}: PredictiveBudgetProps) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const analysis = useMemo(() => {
    const averages = computeAverages(spending);
    const trend = computeTrend(spending);
    const projection = computeProjection(spending, totalBudget);
    return { averages, trend, projection };
  }, [spending, totalBudget]);

  const { averages, trend, projection } = analysis;

  // Build sparkline data (last 30 days grouped)
  const sparklineData = useMemo(() => {
    if (spending.length === 0) return [];
    const sorted = [...spending].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    // Group by day, take last 30
    const byDay = new Map<string, number>();
    for (const r of sorted) {
      const key = r.date.slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + r.amount);
    }
    const entries = Array.from(byDay.entries()).slice(-30);
    const max = Math.max(...entries.map(([, v]) => v), 1);
    return entries.map(([date, amount]) => ({
      date,
      amount,
      height: (amount / max) * 100,
    }));
  }, [spending]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-zinc-100">
            Predictive Budget
          </h2>
          <p className="text-sm text-zinc-500">{periodLabel}</p>
        </div>
        <TrendIcon trend={trend} />
      </div>

      {/* Warning / Status Banner */}
      <WarningBanner
        willExceed={projection.willExceed}
        exceedDate={projection.exceedDate}
        recommendedAdjustment={projection.recommendedAdjustment}
        burnRate={projection.burnRate}
      />

      {/* Budget Gauge */}
      <Card className="border-zinc-800 bg-[#111118]">
        <CardContent className="pt-6">
          <BudgetGauge
            usagePercent={projection.usagePercent}
            willExceed={projection.willExceed}
          />
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-zinc-500">
              Spent:{" "}
              <span className="font-mono text-zinc-200">
                {formatCurrency(projection.spentSoFar)}
              </span>
            </span>
            <span className="text-zinc-500">
              Remaining:{" "}
              <span
                className={cn(
                  "font-mono font-semibold",
                  projection.remaining < 0
                    ? "text-red-400"
                    : "text-emerald-400",
                )}
              >
                {formatCurrency(projection.remaining)}
              </span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Spending Patterns */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-400">
          Spending Patterns
        </h3>
        <Stagger
          className="grid gap-3 sm:grid-cols-3"
          stagger={0.06}
        >
          <StaggerItem>
            <MetricCard
              icon={Activity}
              label="Daily Average"
              value={formatCurrencyPrecise(averages.daily)}
              subtext="per day"
              accent="cyan"
            />
          </StaggerItem>
          <StaggerItem>
            <MetricCard
              icon={Calendar}
              label="Weekly Average"
              value={formatCurrencyPrecise(averages.weekly)}
              subtext="per week"
              accent="cyan"
            />
          </StaggerItem>
          <StaggerItem>
            <MetricCard
              icon={DollarSign}
              label="Monthly Average"
              value={formatCurrencyPrecise(averages.monthly)}
              subtext="per month"
              accent="cyan"
            />
          </StaggerItem>
        </Stagger>
      </div>

      {/* Projection Metrics */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-400">
          30-Day Forecast
        </h3>
        <Stagger
          className="grid gap-3 sm:grid-cols-3"
          stagger={0.06}
        >
          <StaggerItem>
            <MetricCard
              icon={projection.willExceed ? ArrowUpRight : ArrowDownRight}
              label="Projected Spend"
              value={formatCurrency(projection.projected30Day)}
              subtext="next 30 days"
              accent={projection.willExceed ? "red" : "emerald"}
            />
          </StaggerItem>
          <StaggerItem>
            <MetricCard
              icon={Flame}
              label="Burn Rate"
              value={formatCurrencyPrecise(projection.burnRate)}
              subtext="per day"
              accent="amber"
            />
          </StaggerItem>
          <StaggerItem>
            <MetricCard
              icon={Calendar}
              label="Days Remaining"
              value={
                projection.daysRemaining === Infinity
                  ? "∞"
                  : Math.max(0, Math.floor(projection.daysRemaining)).toString()
              }
              subtext={
                projection.daysRemaining < 7
                  ? "critically low"
                  : projection.daysRemaining < 14
                    ? "running low"
                    : "at current rate"
              }
              accent={
                projection.daysRemaining < 7
                  ? "red"
                  : projection.daysRemaining < 14
                    ? "amber"
                    : "emerald"
              }
            />
          </StaggerItem>
        </Stagger>
      </div>

      {/* Sparkline Chart */}
      {sparklineData.length > 0 && (
        <Card className="border-zinc-800 bg-[#111118]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Daily Spend (Last {sparklineData.length} Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-px h-24">
              {sparklineData.map((d, i) => (
                <motion.div
                  key={d.date}
                  className="relative flex-1 cursor-pointer group"
                  onMouseEnter={() => setHoveredDay(i)}
                  onMouseLeave={() => setHoveredDay(null)}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{
                    duration: 0.4,
                    delay: i * 0.02,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{ transformOrigin: "bottom" }}
                >
                  <div
                    className={cn(
                      "w-full rounded-t-sm transition-colors",
                      hoveredDay === i
                        ? "bg-emerald-400"
                        : projection.willExceed && i > sparklineData.length * 0.7
                          ? "bg-red-500/60"
                          : "bg-emerald-500/50",
                    )}
                    style={{ height: `${d.height}%` }}
                  />
                  <AnimatePresence>
                    {hoveredDay === i && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-800 px-2 py-1 text-[10px] font-mono text-zinc-200 shadow-lg z-10"
                      >
                        {formatCurrency(d.amount)}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-zinc-600">
              <span>{sparklineData[0]?.date.slice(5)}</span>
              <span>{sparklineData[sparklineData.length - 1]?.date.slice(5)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  AlertTriangle,
  ChevronRight,
  Layers,
  Percent,
  Lock,
  RefreshCw,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Stagger, StaggerItem, MotionCard, FadeIn } from "@/components/motion/motion";
import { cn } from "@/lib/utils";
import { staggerContainer, staggerItem, fadeUp } from "@/lib/motion";

/* ── Mock data ─────────────────────────────────────────────────────── */

type RiskLevel = "low" | "medium" | "high";

interface YieldOpportunity {
  protocol: string;
  apy: number;
  prevApy: number;
  tvl: string;
  risk: RiskLevel;
  category: string;
  badge: string;
}

const opportunities: YieldOpportunity[] = [
  { protocol: "Aave V3", apy: 4.82, prevApy: 4.51, tvl: "$6.2B", risk: "low", category: "Lending", badge: "USDC" },
  { protocol: "Compound V3", apy: 5.14, prevApy: 5.30, tvl: "$3.1B", risk: "low", category: "Lending", badge: "USDC" },
  { protocol: "Lido", apy: 3.67, prevApy: 3.52, tvl: "$14.8B", risk: "low", category: "Staking", badge: "ETH" },
  { protocol: "Curve 3pool", apy: 8.21, prevApy: 7.85, tvl: "$1.9B", risk: "medium", category: "LP", badge: "3CRV" },
  { protocol: "Convex Finance", apy: 11.5, prevApy: 10.2, tvl: "$1.2B", risk: "medium", category: "Yield", badge: "CVX" },
  { protocol: "GMX V2", apy: 18.3, prevApy: 16.7, tvl: "$680M", risk: "high", category: "Perps", badge: "GLP" },
  { protocol: "Pendle", apy: 22.7, prevApy: 19.4, tvl: "$420M", risk: "high", category: "Yield", badge: "PT" },
];

interface YieldPosition {
  protocol: string;
  deposited: string;
  earned: string;
  apy: number;
  healthFactor: number;
}

const currentPositions: YieldPosition[] = [
  { protocol: "Aave V3", deposited: "$45,000", earned: "$1,824", apy: 4.82, healthFactor: 2.1 },
  { protocol: "Compound V3", deposited: "$30,000", earned: "$1,284", apy: 5.14, healthFactor: 1.8 },
  { protocol: "Lido", deposited: "$25,000", earned: "$762", apy: 3.67, healthFactor: Infinity },
  { protocol: "Curve 3pool", deposited: "$15,000", earned: "$1,032", apy: 8.21, healthFactor: 1.5 },
];

interface AllocationSlice {
  protocol: string;
  percent: number;
  color: string;
}

const recommendedAllocation: AllocationSlice[] = [
  { protocol: "Aave V3", percent: 35, color: "#10b981" },
  { protocol: "Compound V3", percent: 25, color: "#22c55e" },
  { protocol: "Lido", percent: 20, color: "#3b82f6" },
  { protocol: "Curve 3pool", percent: 12, color: "#f59e0b" },
  { protocol: "Reserve", percent: 8, color: "#71717a" },
];

/* ── Helpers ────────────────────────────────────────────────────────── */

const riskConfig: Record<RiskLevel, { label: string; color: string; bg: string; border: string; icon: typeof Shield }> = {
  low:    { label: "Low",    color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: Shield },
  medium: { label: "Medium", color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   icon: AlertTriangle },
  high:   { label: "High",   color: "text-red-400",      bg: "bg-red-500/10",      border: "border-red-500/30",      icon: AlertTriangle },
};

function apyTrend(current: number, previous: number) {
  const diff = current - previous;
  const pct = ((diff / previous) * 100).toFixed(1);
  return { diff, pct, up: diff >= 0 };
}

function healthColor(hf: number) {
  if (hf >= 2) return "text-emerald-400";
  if (hf >= 1.5) return "text-amber-400";
  return "text-red-400";
}

/* ── Sub-components ─────────────────────────────────────────────────── */

function StatCard({ label, value, sub, icon: Icon, accent }: { label: string; value: string; sub?: string; icon: typeof TrendingUp; accent?: string }) {
  return (
    <MotionCard className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
          <motion.p
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className={cn("mt-1 text-2xl font-bold tracking-tight", accent ?? "text-zinc-100")}
          >
            {value}
          </motion.p>
          {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
        </div>
        <div className={cn("rounded-lg p-2", accent === "text-emerald-400" ? "bg-emerald-500/10" : "bg-zinc-800")}>
          <Icon className={cn("h-4 w-4", accent ?? "text-zinc-400")} />
        </div>
      </div>
    </MotionCard>
  );
}

function RiskBadge({ risk }: { risk: RiskLevel }) {
  const cfg = riskConfig[risk];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", cfg.bg, cfg.color, "border", cfg.border)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function TrendIndicator({ current, previous }: { current: number; previous: number }) {
  const { pct, up } = apyTrend(current, previous);
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", up ? "text-emerald-400" : "text-red-400")}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {pct}%
    </span>
  );
}

function AllocationChart() {
  let accumulated = 0;
  return (
    <div className="space-y-4">
      {/* Donut-style bar */}
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        {recommendedAllocation.map((slice) => {
          const offset = accumulated;
          accumulated += slice.percent;
          return (
            <motion.div
              key={slice.protocol}
              initial={{ width: 0 }}
              animate={{ width: `${slice.percent}%` }}
              transition={{ duration: 0.8, delay: offset * 0.01, ease: [0.22, 1, 0.36, 1] }}
              style={{ backgroundColor: slice.color }}
              className="h-full"
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {recommendedAllocation.map((slice, i) => (
          <motion.div
            key={slice.protocol}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.06 }}
            className="flex items-center gap-2"
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
            <span className="text-xs text-zinc-400">{slice.protocol}</span>
            <span className="ml-auto text-xs font-semibold text-zinc-300">{slice.percent}%</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────── */

export default function DefiPage() {
  const totalDeposited = "$115,000";
  const totalEarned = "$4,902";
  const weightedApy = "5.74%";
  const activeProtocols = "4";

  return (
    <AppShell
      title="DeFi Yield Optimizer"
      description="Monitor yield opportunities, manage positions, and optimize allocations across DeFi protocols."
    >
      <div className="space-y-8">
        {/* ── Summary Stats ──────────────────────────────────── */}
        <motion.div variants={staggerContainer(0.07, 0.1)} initial="hidden" animate="visible" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StaggerItem><StatCard label="Total Deposited" value={totalDeposited} sub="Across 4 protocols" icon={Layers} /></StaggerItem>
          <StaggerItem><StatCard label="Total Earned" value={totalEarned} sub="This epoch" icon={TrendingUp} accent="text-emerald-400" /></StaggerItem>
          <StaggerItem><StatCard label="Weighted APY" value={weightedApy} sub="Optimized" icon={Percent} accent="text-emerald-400" /></StaggerItem>
          <StaggerItem><StatCard label="Active Protocols" value={activeProtocols} sub="All healthy" icon={Lock} /></StaggerItem>
        </motion.div>

        {/* ── Yield Opportunities Table ──────────────────────── */}
        <FadeIn>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-zinc-100">Yield Opportunities</h2>
                <p className="mt-0.5 text-xs text-zinc-500">Live rates from on-chain oracles</p>
              </div>
              <motion.button
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.5 }}
                className="rounded-lg border border-zinc-700 p-1.5 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
              >
                <RefreshCw className="h-4 w-4" />
              </motion.button>
            </div>

            {/* Table header */}
            <div className="hidden grid-cols-[1fr_100px_100px_100px_100px_80px] gap-4 border-b border-zinc-800/60 px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-zinc-500 md:grid">
              <span>Protocol</span>
              <span className="text-right">APY</span>
              <span className="text-right">Trend</span>
              <span className="text-right">TVL</span>
              <span className="text-right">Risk</span>
              <span className="text-right">Action</span>
            </div>

            {/* Rows */}
            <motion.div variants={staggerContainer(0.04, 0.2)} initial="hidden" animate="visible">
              {opportunities.map((opp, i) => (
                <motion.div
                  key={opp.protocol}
                  variants={staggerItem}
                  className={cn(
                    "group grid items-center gap-4 px-6 py-4 transition-colors hover:bg-zinc-800/30 md:grid-cols-[1fr_100px_100px_100px_100px_80px]",
                    i !== opportunities.length - 1 && "border-b border-zinc-800/40",
                  )}
                >
                  {/* Protocol */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-sm font-bold text-zinc-300">
                      {opp.protocol.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{opp.protocol}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">{opp.category}</span>
                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">{opp.badge}</span>
                      </div>
                    </div>
                  </div>

                  {/* APY */}
                  <div className="text-right">
                    <span className="font-mono text-sm font-semibold text-emerald-400">{opp.apy.toFixed(2)}%</span>
                  </div>

                  {/* Trend */}
                  <div className="text-right">
                    <TrendIndicator current={opp.apy} previous={opp.prevApy} />
                  </div>

                  {/* TVL */}
                  <div className="text-right">
                    <span className="font-mono text-sm text-zinc-400">{opp.tvl}</span>
                  </div>

                  {/* Risk */}
                  <div className="text-right">
                    <RiskBadge risk={opp.risk} />
                  </div>

                  {/* Action */}
                  <div className="text-right">
                    <motion.button
                      whileHover={{ x: 2 }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      Deposit <ChevronRight className="h-3 w-3" />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </FadeIn>

        {/* ── Bottom Grid: Positions + Allocation ────────────── */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Current Positions */}
          <FadeIn className="lg:col-span-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
              <div className="border-b border-zinc-800 px-6 py-4">
                <h2 className="text-base font-semibold text-zinc-100">Current Positions</h2>
                <p className="mt-0.5 text-xs text-zinc-500">Active yield-bearing deposits</p>
              </div>

              <motion.div variants={staggerContainer(0.06, 0.15)} initial="hidden" animate="visible">
                {currentPositions.map((pos, i) => (
                  <motion.div
                    key={pos.protocol}
                    variants={staggerItem}
                    className={cn(
                      "grid items-center gap-4 px-6 py-4 transition-colors hover:bg-zinc-800/30 sm:grid-cols-[1fr_1fr_1fr_1fr]",
                      i !== currentPositions.length - 1 && "border-b border-zinc-800/40",
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{pos.protocol}</p>
                      <p className="text-xs text-zinc-500">Health: <span className={cn("font-mono font-semibold", healthColor(pos.healthFactor))}>{pos.healthFactor === Infinity ? "∞" : pos.healthFactor.toFixed(1)}</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Deposited</p>
                      <p className="font-mono text-sm font-semibold text-zinc-200">{pos.deposited}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Earned</p>
                      <p className="font-mono text-sm font-semibold text-emerald-400">{pos.earned}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-500">APY</p>
                      <p className="font-mono text-sm font-semibold text-zinc-200">{pos.apy.toFixed(2)}%</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </FadeIn>

          {/* Recommended Allocation */}
          <FadeIn className="lg:col-span-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              <div className="mb-5">
                <h2 className="text-base font-semibold text-zinc-100">Recommended Allocation</h2>
                <p className="mt-0.5 text-xs text-zinc-500">AI-optimized portfolio distribution</p>
              </div>

              <AllocationChart />

              {/* Risk summary */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4"
              >
                <div className="flex items-start gap-2">
                  <Shield className="mt-0.5 h-4 w-4 text-emerald-400" />
                  <div>
                    <p className="text-xs font-medium text-zinc-300">Risk Assessment</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                      Current allocation favors low-risk lending protocols (60%). Recommended rebalance increases yield by ~1.2% APY while maintaining risk within acceptable thresholds.
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
              >
                <RefreshCw className="h-4 w-4" />
                Rebalance Portfolio
              </motion.button>
            </div>
          </FadeIn>
        </div>
      </div>
    </AppShell>
  );
}

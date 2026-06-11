"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/layout/app-shell";
import { Stagger, StaggerItem } from "@/components/motion/motion";
import {
  Shield,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Activity,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---
type RiskLevel = "low" | "medium" | "high" | "critical";

interface RiskFactor {
  name: string;
  score: number;
  maxScore: number;
  description: string;
}

interface Transaction {
  id: string;
  hash: string;
  from: string;
  to: string;
  amount: string;
  token: string;
  timestamp: string;
  riskScore: number;
  riskLevel: RiskLevel;
  factors: RiskFactor[];
}

interface TrendPoint {
  day: string;
  avgScore: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

// --- Mock Data ---
const mockTransactions: Transaction[] = [
  {
    id: "1",
    hash: "0x8f3a...b2c1",
    from: "0xA1b2...3C4D",
    to: "0xE5f6...7G8H",
    amount: "125,000",
    token: "USDC",
    timestamp: "2 min ago",
    riskScore: 92,
    riskLevel: "critical",
    factors: [
      { name: "Amount Anomaly", score: 35, maxScore: 40, description: "Amount exceeds 99th percentile for this recipient" },
      { name: "Velocity Check", score: 28, maxScore: 30, description: "3 similar transactions in last 10 minutes" },
      { name: "Recipient Trust", score: 12, maxScore: 20, description: "Recipient wallet age < 48 hours" },
      { name: "Geo Risk", score: 17, maxScore: 10, description: "Transaction originates from high-risk jurisdiction" },
    ],
  },
  {
    id: "2",
    hash: "0x4d2e...f9a0",
    from: "0xB3c4...5D6E",
    to: "0xF7g8...9H0I",
    amount: "8,500",
    token: "USDC",
    timestamp: "8 min ago",
    riskScore: 67,
    riskLevel: "high",
    factors: [
      { name: "Amount Anomaly", score: 22, maxScore: 40, description: "Amount is 2.3x above rolling average" },
      { name: "Velocity Check", score: 15, maxScore: 30, description: "1 prior transaction in last hour" },
      { name: "Recipient Trust", score: 18, maxScore: 20, description: "Recipient has moderate trust history" },
      { name: "Geo Risk", score: 12, maxScore: 10, description: "VPN usage detected from sender" },
    ],
  },
  {
    id: "3",
    hash: "0x1b5c...d8e7",
    from: "0xC5d6...7E8F",
    to: "0xH9i0...1J2K",
    amount: "2,100",
    token: "USDC",
    timestamp: "15 min ago",
    riskScore: 38,
    riskLevel: "medium",
    factors: [
      { name: "Amount Anomaly", score: 10, maxScore: 40, description: "Amount within normal range" },
      { name: "Velocity Check", score: 8, maxScore: 30, description: "Normal transaction frequency" },
      { name: "Recipient Trust", score: 12, maxScore: 20, description: "Recipient has established trust history" },
      { name: "Geo Risk", score: 8, maxScore: 10, description: "Minor geo-mismatch flagged" },
    ],
  },
  {
    id: "4",
    hash: "0x7e9f...a3b2",
    from: "0xD7e8...9F0G",
    to: "0xK3l4...5M6N",
    amount: "450",
    token: "USDC",
    timestamp: "22 min ago",
    riskScore: 14,
    riskLevel: "low",
    factors: [
      { name: "Amount Anomaly", score: 2, maxScore: 40, description: "Routine amount" },
      { name: "Velocity Check", score: 3, maxScore: 30, description: "Normal cadence" },
      { name: "Recipient Trust", score: 5, maxScore: 20, description: "Long-standing trusted recipient" },
      { name: "Geo Risk", score: 4, maxScore: 10, description: "No geo anomalies" },
    ],
  },
  {
    id: "5",
    hash: "0x2a8b...c4d3",
    from: "0xE9f0...1G2H",
    to: "0xM7n8...9O0P",
    amount: "45,000",
    token: "USDC",
    timestamp: "31 min ago",
    riskScore: 85,
    riskLevel: "critical",
    factors: [
      { name: "Amount Anomaly", score: 38, maxScore: 40, description: "Extreme amount deviation detected" },
      { name: "Velocity Check", score: 22, maxScore: 30, description: "Unusual burst of transactions" },
      { name: "Recipient Trust", score: 15, maxScore: 20, description: "Recipient flagged in prior audit" },
      { name: "Geo Risk", score: 10, maxScore: 10, description: "Transaction from sanctioned region" },
    ],
  },
  {
    id: "6",
    hash: "0x5f1d...e6f5",
    from: "0xF1g2...3H4I",
    to: "0xO9p0...1Q2R",
    amount: "1,200",
    token: "USDC",
    timestamp: "45 min ago",
    riskScore: 23,
    riskLevel: "low",
    factors: [
      { name: "Amount Anomaly", score: 5, maxScore: 40, description: "Standard amount" },
      { name: "Velocity Check", score: 6, maxScore: 30, description: "Normal frequency" },
      { name: "Recipient Trust", score: 8, maxScore: 20, description: "Verified recipient" },
      { name: "Geo Risk", score: 4, maxScore: 10, description: "No anomalies" },
    ],
  },
  {
    id: "7",
    hash: "0x9c3e...g7h6",
    from: "0xG3h4...5I6J",
    to: "0xQ1r2...3S4T",
    amount: "6,700",
    token: "USDC",
    timestamp: "1 hr ago",
    riskScore: 52,
    riskLevel: "medium",
    factors: [
      { name: "Amount Anomaly", score: 18, maxScore: 40, description: "Slightly above average" },
      { name: "Velocity Check", score: 12, maxScore: 30, description: "Moderate frequency" },
      { name: "Recipient Trust", score: 14, maxScore: 20, description: "New recipient relationship" },
      { name: "Geo Risk", score: 8, maxScore: 10, description: "Minor geo flags" },
    ],
  },
];

const trendData: TrendPoint[] = [
  { day: "Mon", avgScore: 42, critical: 1, high: 3, medium: 8, low: 15 },
  { day: "Tue", avgScore: 38, critical: 0, high: 2, medium: 6, low: 18 },
  { day: "Wed", avgScore: 55, critical: 2, high: 5, medium: 7, low: 12 },
  { day: "Thu", avgScore: 47, critical: 1, high: 3, medium: 9, low: 14 },
  { day: "Fri", avgScore: 61, critical: 3, high: 6, medium: 5, low: 10 },
  { day: "Sat", avgScore: 35, critical: 0, high: 1, medium: 4, low: 20 },
  { day: "Sun", avgScore: 44, critical: 1, high: 2, medium: 7, low: 16 },
];

// --- Helpers ---
const riskColors: Record<RiskLevel, { bg: string; text: string; border: string; glow: string }> = {
  low: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    glow: "shadow-[0_0_12px_rgba(16,185,129,0.15)]",
  },
  medium: {
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    border: "border-amber-500/30",
    glow: "shadow-[0_0_12px_rgba(245,158,11,0.15)]",
  },
  high: {
    bg: "bg-red-500/15",
    text: "text-red-400",
    border: "border-red-500/30",
    glow: "shadow-[0_0_12px_rgba(239,68,68,0.15)]",
  },
  critical: {
    bg: "bg-red-600/20",
    text: "text-red-500",
    border: "border-red-600/40",
    glow: "shadow-[0_0_16px_rgba(220,38,38,0.2)]",
  },
};

const riskIcons: Record<RiskLevel, typeof ShieldCheck> = {
  low: ShieldCheck,
  medium: Shield,
  high: ShieldAlert,
  critical: ShieldX,
};

function getRiskBarColor(score: number): string {
  if (score >= 80) return "bg-red-600";
  if (score >= 60) return "bg-red-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-emerald-500";
}

// --- Components ---
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  delay,
}: {
  label: string;
  value: string | number;
  icon: typeof Shield;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2, transition: { type: "spring", stiffness: 260, damping: 24 } }}
      className="rounded-xl border border-zinc-800 bg-[#111118] p-5"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
        <Icon className={cn("h-4 w-4", color)} />
      </div>
      <p className={cn("mt-2 text-2xl font-bold tracking-tight", color)}>{value}</p>
    </motion.div>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const colors = riskColors[level];
  const Icon = riskIcons[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
        colors.bg,
        colors.text,
        "border",
        colors.border
      )}
    >
      <Icon className="h-3 w-3" />
      {level}
    </span>
  );
}

function RiskFactorBar({ factor, delay }: { factor: RiskFactor; delay: number }) {
  const pct = (factor.score / factor.maxScore) * 100;
  const barColor = pct >= 75 ? "bg-red-500" : pct >= 50 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="space-y-1.5"
    >
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-zinc-300">{factor.name}</span>
        <span className="font-mono text-zinc-500">
          {factor.score}<span className="text-zinc-600">/{factor.maxScore}</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: delay + 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className={cn("h-full rounded-full", barColor)}
        />
      </div>
      <p className="text-[11px] text-zinc-600">{factor.description}</p>
    </motion.div>
  );
}

function TransactionRow({ tx, index }: { tx: Transaction; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const colors = riskColors[tx.riskLevel];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "rounded-xl border bg-[#111118] transition-colors",
        expanded ? colors.border : "border-zinc-800",
        expanded && colors.glow
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-4 p-4 text-left"
      >
        {/* Score Ring */}
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
          <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
            <motion.circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke={tx.riskScore >= 80 ? "#dc2626" : tx.riskScore >= 60 ? "#ef4444" : tx.riskScore >= 40 ? "#f59e0b" : "#10b981"}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${(tx.riskScore / 100) * 125.6} 125.6`}
              initial={{ strokeDasharray: "0 125.6" }}
              animate={{ strokeDasharray: `${(tx.riskScore / 100) * 125.6} 125.6` }}
              transition={{ delay: index * 0.06 + 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
          <span className={cn("absolute text-xs font-bold", colors.text)}>{tx.riskScore}</span>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-zinc-200">{tx.hash}</span>
            <RiskBadge level={tx.riskLevel} />
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
            <span>{tx.from}</span>
            <span className="text-zinc-700">→</span>
            <span>{tx.to}</span>
          </div>
        </div>

        {/* Amount & Time */}
        <div className="shrink-0 text-right">
          <p className="font-mono text-sm font-semibold text-zinc-200">
            {tx.amount} <span className="text-zinc-500">{tx.token}</span>
          </p>
          <p className="mt-0.5 text-xs text-zinc-600">{tx.timestamp}</p>
        </div>

        {/* Expand */}
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown className="h-4 w-4 text-zinc-600" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-zinc-800/50 px-4 pb-4 pt-3">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <Eye className="h-3 w-3" />
                Risk Factor Breakdown
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {tx.factors.map((f, i) => (
                  <RiskFactorBar key={f.name} factor={f} delay={i * 0.08} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TrendChart() {
  const maxVal = Math.max(...trendData.map((d) => d.avgScore));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.45 }}
      className="rounded-xl border border-zinc-800 bg-[#111118] p-6"
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">7-Day Risk Trend</h3>
          <p className="mt-0.5 text-xs text-zinc-500">Average risk score & distribution</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-600" />
            Critical
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            High
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Medium
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Low
          </span>
        </div>
      </div>

      {/* Chart area */}
      <div className="relative h-48">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((v) => (
          <div
            key={v}
            className="absolute left-0 right-0 border-t border-zinc-800/60"
            style={{ bottom: `${v}%` }}
          >
            <span className="absolute -left-8 -top-2 text-[10px] text-zinc-600">{v}</span>
          </div>
        ))}

        {/* Bars */}
        <div className="absolute inset-0 flex items-end justify-between px-2">
          {trendData.map((d, i) => {
            const total = d.critical + d.high + d.medium + d.low;
            return (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <motion.div
                  className="flex w-8 flex-col-reverse overflow-hidden rounded-t-sm"
                  initial={{ height: 0 }}
                  animate={{ height: `${(d.avgScore / 100) * 100}%` }}
                  transition={{ delay: 0.4 + i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  {total > 0 && (
                    <>
                      <div
                        className="bg-emerald-500"
                        style={{ height: `${(d.low / total) * 100}%` }}
                      />
                      <div
                        className="bg-amber-500"
                        style={{ height: `${(d.medium / total) * 100}%` }}
                      />
                      <div
                        className="bg-red-500"
                        style={{ height: `${(d.high / total) * 100}%` }}
                      />
                      <div
                        className="bg-red-600"
                        style={{ height: `${(d.critical / total) * 100}%` }}
                      />
                    </>
                  )}
                </motion.div>
                <span className="text-[10px] text-zinc-600">{d.day}</span>
              </div>
            );
          })}
        </div>

        {/* Average line */}
        <motion.div
          className="absolute left-0 right-0 border-t border-dashed border-emerald-500/40"
          style={{ bottom: `${(trendData.reduce((s, d) => s + d.avgScore, 0) / trendData.length / 100) * 100}%` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <span className="absolute -right-2 -top-4 text-[10px] text-emerald-500">avg</span>
        </motion.div>
      </div>
    </motion.div>
  );
}

// --- Page ---
export default function RiskPage() {
  const criticalCount = mockTransactions.filter((t) => t.riskLevel === "critical").length;
  const highCount = mockTransactions.filter((t) => t.riskLevel === "high").length;
  const avgScore = Math.round(
    mockTransactions.reduce((s, t) => s + t.riskScore, 0) / mockTransactions.length
  );

  return (
    <AppShell
      title="Risk Scoring"
      description="Real-time transaction risk assessment and monitoring"
    >
      <div className="space-y-6">
        {/* Stat Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Avg Risk Score"
            value={avgScore}
            icon={Activity}
            color="text-amber-400"
            delay={0}
          />
          <StatCard
            label="Critical Alerts"
            value={criticalCount}
            icon={ShieldX}
            color="text-red-500"
            delay={0.06}
          />
          <StatCard
            label="High Risk"
            value={highCount}
            icon={ShieldAlert}
            color="text-red-400"
            delay={0.12}
          />
          <StatCard
            label="Transactions Monitored"
            value={mockTransactions.length}
            icon={Eye}
            color="text-emerald-400"
            delay={0.18}
          />
        </div>

        {/* Trend Chart */}
        <TrendChart />

        {/* Transaction List */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-200">Recent Transactions</h2>
            <p className="text-xs text-zinc-500">
              Showing {mockTransactions.length} assessed transactions
            </p>
          </div>
          <Stagger className="space-y-3" stagger={0.06}>
            {mockTransactions.map((tx, i) => (
              <StaggerItem key={tx.id}>
                <TransactionRow tx={tx} index={i} />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </AppShell>
  );
}

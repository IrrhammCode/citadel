"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import {
  Shield,
  Bot,
  Zap,
  Activity,
  Lightbulb,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Loader2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { LandingCta } from "@/components/landing/landing-cta";
import { GrantPermissionModal } from "@/components/permissions/grant-permission-modal";
import { EnhancedVerdictPanel } from "@/components/audit/enhanced-verdict-panel";
import { TrustScoreBadge } from "@/components/agent/trust-score-badge";
import { ActivityFeed } from "@/components/agent/activity-feed";
import { VeniceSuggestions } from "@/components/agent/venice-suggestions";
import { BudgetPoolCard } from "@/components/agent/budget-pool-card";
import { UpgradeToSmartAccount } from "@/components/agent/upgrade-7702";
import { AnomalyAlerts } from "@/components/agent/anomaly-alerts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEnhancedAudit } from "@/hooks/useEnhancedAudit";
import { usePermissions } from "@/hooks/usePermissions";
import {
  getTrustScore,
  getBudgetPool,
  getAnomalies,
  getAuditLog,
  addActivity,
  updateTrustScore,
  addDailySpend,
} from "@/lib/storage";
import { AUTONOMOUS_SYSTEMS } from "@/types/system";
import { DEFAULT_VENDOR_ADDRESS } from "@/lib/constants";
import type { EnhancedVerdict } from "@/lib/venice/client";

const STEPS = [
  { id: "connect", title: "Connect Wallet", icon: Wallet },
  { id: "permission", title: "Grant Permission", icon: Shield },
  { id: "agent", title: "Agent Decides", icon: Bot },
  { id: "venice", title: "Venice Audits", icon: Zap },
  { id: "execute", title: "Execute / Block", icon: CheckCircle2 },
  { id: "learn", title: "Agent Learns", icon: TrendingUp },
];

export default function DemoPage() {
  const { isConnected } = useAccount();
  const { permissions, refresh } = usePermissions();
  const { audit, loading: auditLoading, verdict } = useEnhancedAudit();

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedSystem] = useState(AUTONOMOUS_SYSTEMS[0]); // Marketing Agent
  const [amount, setAmount] = useState("8");
  const [recipient, setRecipient] = useState<string>(DEFAULT_VENDOR_ADDRESS);
  const [memo, setMemo] = useState("Q2 marketing vendor invoice #1042");
  const [executing, setExecuting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const permission = permissions.find((p) => p.systemId === selectedSystem.id);
  const trustScore = getTrustScore(selectedSystem.id);
  const pool = getBudgetPool();
  const anomalies = getAnomalies(selectedSystem.id);
  const auditLog = getAuditLog();

  // Auto-advance steps
  useEffect(() => {
    if (isConnected && currentStep === 0) setCurrentStep(1);
  }, [isConnected, currentStep]);

  async function handleSpend() {
    if (!permission) return;

    setCurrentStep(2); // Agent decides
    await new Promise((r) => setTimeout(r, 800));

    setCurrentStep(3); // Venice audits
    const result = await audit({
      systemId: selectedSystem.id,
      spendRequest: { amount, token: "USDC", recipient, memo },
      permission: {
        maxDailySpend: permission.maxDailySpend,
        expiry: permission.expiry,
        justification: permission.justification,
      },
      priorSpendToday: getAuditLog()
        .filter((r) => r.systemId === selectedSystem.id)
        .reduce((sum, r) => sum + parseFloat(r.spendRequest.amount), 0)
        .toString(),
    });

    if (result) {
      setCurrentStep(4); // Execute / Block

      addActivity({
        type: "audit",
        systemId: selectedSystem.id,
        systemName: selectedSystem.name,
        message: `${result.decision === "approved" ? "Approved" : "Blocked"}: ${amount} USDC to ${recipient.slice(0, 10)}...`,
        details: result.reasoning,
        severity: result.decision === "approved" ? "success" : "error",
      });

      if (result.decision === "approved") {
        addDailySpend(selectedSystem.id, amount);
        updateTrustScore(selectedSystem.id, {
          type: "success",
          description: `Approved: ${amount} USDC`,
          points: 1,
          timestamp: Date.now(),
        });
      } else {
        updateTrustScore(selectedSystem.id, {
          type: "blocked",
          description: `Blocked: ${result.reasoning.slice(0, 50)}`,
          points: -5,
          timestamp: Date.now(),
        });
      }

      await new Promise((r) => setTimeout(r, 500));
      setCurrentStep(5); // Agent learns
    }
  }

  function resetDemo() {
    setCurrentStep(1);
    setTxHash(null);
    setAmount("8");
    setRecipient(DEFAULT_VENDOR_ADDRESS);
    setMemo("Q2 marketing vendor invoice #1042");
  }

  return (
    <AppShell
      title="Citadel — AI CFO Demo"
      description="Watch the full autonomous treasury flow: Agent decides → Venice audits → Execute → Learn"
    >
      <div className="space-y-8">
        {/* Connection Gate */}
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center"
          >
            <Shield className="h-12 w-12 text-amber-400" />
            <div>
              <h2 className="text-xl font-bold text-zinc-100">Connect to Start Demo</h2>
              <p className="mt-2 text-zinc-400">Connect MetaMask to see the full autonomous treasury flow</p>
            </div>
            <LandingCta />
          </motion.div>
        )}

        {isConnected && (
          <>
            {/* Step Indicator */}
            <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                const isActive = i === currentStep;
                const isDone = i < currentStep;

                return (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex items-center gap-2 ${isActive ? "text-cyan-400" : isDone ? "text-emerald-400" : "text-zinc-600"}`}>
                      <div className={`rounded-full p-2 ${isActive ? "bg-cyan-500/20" : isDone ? "bg-emerald-500/20" : "bg-zinc-800"}`}>
                        {isDone ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : isActive ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </div>
                      <span className="hidden text-sm font-medium sm:block">{step.title}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <ArrowRight className="mx-2 h-4 w-4 text-zinc-700" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Main Content */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left: Controls */}
              <div className="lg:col-span-2 space-y-6">
                {/* Step 1: Permission */}
                {currentStep >= 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
                  >
                    <h3 className="font-semibold text-zinc-100">Step 1: Grant Permission</h3>
                    <p className="mt-1 text-sm text-zinc-400">
                      CFO grants ERC-7715 permission to {selectedSystem.name}
                    </p>
                    <div className="mt-4">
                      <GrantPermissionModal
                        systemId={selectedSystem.id}
                        systemName={selectedSystem.name}
                        existingPermission={permission}
                        onGranted={refresh}
                      />
                    </div>
                    {permission && (
                      <div className="mt-3 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-400">
                        ✓ Permission active: {permission.maxDailySpend} USDC/day
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Step 2-3: Spend Request + Venice Audit */}
                {currentStep >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
                  >
                    <h3 className="font-semibold text-zinc-100">Step 2: Agent Requests Spend</h3>
                    <p className="mt-1 text-sm text-zinc-400">
                      {selectedSystem.name} found a vendor opportunity
                    </p>

                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <div>
                        <Label className="text-zinc-400">Amount (USDC)</Label>
                        <Input
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="mt-1 bg-zinc-800 border-zinc-700"
                        />
                      </div>
                      <div>
                        <Label className="text-zinc-400">Recipient</Label>
                        <Input
                          value={recipient}
                          onChange={(e) => setRecipient(e.target.value)}
                          className="mt-1 bg-zinc-800 border-zinc-700 font-mono text-xs"
                          placeholder="0x..."
                        />
                      </div>
                      <div>
                        <Label className="text-zinc-400">Memo</Label>
                        <Input
                          value={memo}
                          onChange={(e) => setMemo(e.target.value)}
                          className="mt-1 bg-zinc-800 border-zinc-700"
                        />
                      </div>
                    </div>

                    <Button
                      className="mt-4"
                      onClick={handleSpend}
                      disabled={auditLoading || !permission}
                    >
                      {auditLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Zap className="mr-2 h-4 w-4" />
                      )}
                      Submit to Venice AI
                    </Button>
                  </motion.div>
                )}

                {/* Step 4: Venice Verdict */}
                {currentStep >= 4 && verdict && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <EnhancedVerdictPanel verdict={verdict} />
                  </motion.div>
                )}

                {/* Step 5: Execution Result */}
                {currentStep >= 5 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
                  >
                    <h3 className="font-semibold text-zinc-100">Step 3: Result</h3>
                    {verdict?.decision === "approved" ? (
                      <div className="mt-4 rounded-lg bg-emerald-500/10 p-4">
                        <div className="flex items-center gap-2 text-emerald-400">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="font-medium">Transaction Executed</span>
                        </div>
                        <p className="mt-2 text-sm text-zinc-400">
                          {amount} USDC sent to {recipient.slice(0, 10)}...
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Agent trust score +1 • Daily spend updated
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-lg bg-red-500/10 p-4">
                        <div className="flex items-center gap-2 text-red-400">
                          <XCircle className="h-5 w-5" />
                          <span className="font-medium">Transaction Blocked</span>
                        </div>
                        <p className="mt-2 text-sm text-zinc-400">
                          Venice AI blocked this transaction
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Agent trust score -5 • Agent learned from this
                        </p>
                      </div>
                    )}

                    <Button variant="outline" className="mt-4" onClick={resetDemo}>
                      Try Another Transaction
                    </Button>
                  </motion.div>
                )}
              </div>

              {/* Right: Agent Status */}
              <div className="space-y-6">
                <TrustScoreBadge trustScore={trustScore} />
                <BudgetPoolCard pool={pool} />
                <AnomalyAlerts anomalies={anomalies} />
                <ActivityFeed limit={10} />
              </div>
            </div>

            {/* Bottom: Venice Suggestions + 7702 */}
            <div className="grid gap-6 lg:grid-cols-2">
              <VeniceSuggestions />
              <UpgradeToSmartAccount />
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

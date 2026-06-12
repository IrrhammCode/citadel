"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { parseUnits } from "viem";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Target,
  Shield,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createMetaMaskWalletClient } from "@/lib/metamask/wallet-client";
import { CHAIN_ID, USDC_ADDRESS } from "@/lib/constants";
import {
  saveCustomSystem,
  savePermission,
  saveAgentGoal,
  updateBudgetPool,
  getBudgetPool,
  addActivity,
} from "@/lib/storage";
import { setAutonomyLevel } from "@/lib/agent/autonomy";
import { syncToServer } from "@/lib/store-sync";
import type { AutonomousSystem } from "@/types/system";
import type { StoredPermission } from "@/types/permission";

const STEPS = ["Identity", "Mandate", "Policy", "Authorize", "Activate"] as const;

type Props = {
  onComplete?: (system: AutonomousSystem) => void;
};

export function RegisterAgentWizard({ onComplete }: Props) {
  const { address, isConnected } = useAccount();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1: Identity
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("custom");

  // Step 2: Mandate
  const [goal, setGoal] = useState("");
  const [budget, setBudget] = useState("100");
  const [kpiName, setKpiName] = useState("ROI");
  const [kpiTarget, setKpiTarget] = useState("2.0");

  // Step 3: Policy
  const [customPrompt, setCustomPrompt] = useState("");
  const [autonomyLevel, setAutonomyLevelState] = useState<"supervised" | "semi-auto" | "full-auto">("semi-auto");

  // Step 4: Authorization
  const [maxDailySpend, setMaxDailySpend] = useState("10");
  const [expiryDays, setExpiryDays] = useState("7");

  const [registeredSystem, setRegisteredSystem] = useState<AutonomousSystem | null>(null);

  async function handleGrantPermission(system: AutonomousSystem) {
    if (!isConnected || !address) {
      toast.error("Connect MetaMask first");
      return;
    }

    setLoading(true);
    try {
      const sessionRes = await fetch("/api/session-address");
      if (!sessionRes.ok) throw new Error("Session account not configured");
      const { address: sessionAddress } = (await sessionRes.json()) as { address: string };

      const walletClient = createMetaMaskWalletClient();
      const currentTime = Math.floor(Date.now() / 1000);
      const expiry = currentTime + Number(expiryDays) * 86400;
      const justification = `Authorize ${system.name} to spend USDC within treasury limits.`;

      const grantedPermissions = await walletClient.requestExecutionPermissions([
        {
          chainId: CHAIN_ID,
          expiry,
          to: sessionAddress as `0x${string}`,
          permission: {
            type: "erc20-token-periodic",
            data: {
              tokenAddress: USDC_ADDRESS,
              periodAmount: parseUnits(maxDailySpend, 6),
              periodDuration: 86400,
              justification,
            },
            isAdjustmentAllowed: true,
          },
        },
      ]);

      const stored: StoredPermission = {
        id: crypto.randomUUID(),
        systemId: system.id,
        systemName: system.name,
        maxDailySpend,
        expiry,
        justification,
        grantedAt: Date.now(),
        sessionAddress,
        grantedPermissions,
      };

      savePermission(stored);
      setStep(4);
      toast.success("ERC-7715 permission granted!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Permission grant failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate() {
    if (!registeredSystem) return;
    setLoading(true);
    try {
      setAutonomyLevel(registeredSystem.id, autonomyLevel);

      const pool = getBudgetPool();
      const budgetNum = parseFloat(budget);
      pool.allocations.push({ systemId: registeredSystem.id, amount: budgetNum });
      pool.allocated += budgetNum;
      pool.unallocated = Math.max(0, pool.unallocated - budgetNum);
      updateBudgetPool(pool);

      await syncToServer();

      addActivity({
        type: "goal_progress",
        systemId: registeredSystem.id,
        systemName: registeredSystem.name,
        message: `Agent registered and activated`,
        details: `Budget: ${budget} USDC, autonomy: ${autonomyLevel}`,
        severity: "success",
      });

      // Auto-run first agent cycle
      try {
        const cycleRes = await fetch("/api/agent/loop", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ systemId: registeredSystem.id }),
        });
        if (cycleRes.ok) {
          toast.success("First agent cycle started");
        }
      } catch {
        /* cycle optional on activate */
      }

      const { pullFromServer } = await import("@/lib/store-sync");
      await pullFromServer();

      toast.success(`${registeredSystem.name} is live!`);
      onComplete?.(registeredSystem);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Activation failed");
    } finally {
      setLoading(false);
    }
  }

  function handleCreateSystem() {
    if (!name || !description || !goal) {
      toast.error("Fill in all required fields");
      return;
    }

    const system: AutonomousSystem = {
      id: crypto.randomUUID(),
      name,
      description,
      category,
      status: "active",
      goal,
      budget: parseFloat(budget),
      kpiTargets: [
        { name: kpiName, target: parseFloat(kpiTarget), unit: kpiName === "ROI" ? "x" : "%", isHigherBetter: true },
        { name: "Max Single Payment", target: parseFloat(maxDailySpend), unit: "usdc", isHigherBetter: false },
      ],
      customPrompt: customPrompt.trim() || undefined,
      isCustom: true,
    };

    saveCustomSystem(system);
    saveAgentGoal({
      id: crypto.randomUUID(),
      systemId: system.id,
      description: goal,
      budget: parseFloat(budget),
      spent: 0,
      kpis: system.kpiTargets!.map((k) => ({
        name: k.name,
        target: k.target,
        current: 0,
        unit: k.unit,
        isHigherBetter: k.isHigherBetter,
      })),
      startDate: Date.now(),
      endDate: Date.now() + 90 * 86400000,
      status: "active",
    });

    setRegisteredSystem(system);
    window.dispatchEvent(new Event("systems_updated"));
    setStep(3);
  }

  return (
    <Card className="border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-emerald-400" />
              Register Agent
            </CardTitle>
            <CardDescription>
              One flow: identity → mandate → policy → grant permission → activate
            </CardDescription>
          </div>
          <div className="flex gap-1">
            {STEPS.map((s, i) => (
              <Badge
                key={s}
                variant={i === step ? "default" : i < step ? "secondary" : "outline"}
                className="text-[10px]"
              >
                {i + 1}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Agent Name</Label>
                  <Input placeholder="e.g. Q2 Marketing Agent" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input placeholder="What does this agent do?" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input value={category} onChange={(e) => setCategory(e.target.value)} />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Target className="h-4 w-4 text-emerald-400" />
                  Define agent mandate and budget
                </div>
                <div className="space-y-2">
                  <Label>Goal</Label>
                  <Input placeholder="Maximize Q2 ROI with vendor payments" value={goal} onChange={(e) => setGoal(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Budget (USDC)</Label>
                    <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Primary KPI</Label>
                    <Input value={kpiName} onChange={(e) => setKpiName(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>KPI Target</Label>
                  <Input type="number" value={kpiTarget} onChange={(e) => setKpiTarget(e.target.value)} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Venice AI Compliance Rule</Label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                    placeholder="e.g. Only approve payments under 50 USDC to known vendors."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Autonomy Level</Label>
                  <div className="flex gap-2">
                    {(["supervised", "semi-auto", "full-auto"] as const).map((level) => (
                      <Button
                        key={level}
                        variant={autonomyLevel === level ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAutonomyLevelState(level)}
                      >
                        {level}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && registeredSystem && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  Grant ERC-7715 permission via MetaMask
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                  <p className="font-medium text-zinc-200">{registeredSystem.name}</p>
                  <p className="text-sm text-zinc-500">{registeredSystem.goal}</p>
                  <p className="mt-2 text-sm text-zinc-400">Budget: {budget} USDC</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Daily Spend (USDC)</Label>
                    <Input type="number" value={maxDailySpend} onChange={(e) => setMaxDailySpend(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (days)</Label>
                    <Input type="number" value={expiryDays} onChange={(e) => setExpiryDays(e.target.value)} />
                  </div>
                </div>
                <Button onClick={() => handleGrantPermission(registeredSystem)} disabled={loading || !isConnected} className="w-full">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                  {loading ? "Awaiting MetaMask..." : "Request Permission"}
                </Button>
              </div>
            )}

            {step === 4 && registeredSystem && (
              <div className="space-y-4 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
                <h3 className="text-lg font-semibold text-zinc-100">{registeredSystem.name} Ready</h3>
                <p className="text-sm text-zinc-400">
                  Permission granted. Activate to allocate budget and start the agent.
                </p>
                <Button onClick={handleActivate} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activate Agent"}
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0 || step >= 3}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          {step < 2 && (
            <Button size="sm" onClick={() => setStep(step + 1)} disabled={step === 0 && !name}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          {step === 2 && (
            <Button size="sm" onClick={handleCreateSystem} disabled={!goal}>
              Create & Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

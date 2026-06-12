"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  UserPlus,
  Activity,
  Bot,
  Brain,
  Shield,
  Zap,
  ScrollText,
  CheckCircle2,
  Play,
  RotateCcw,
  ArrowRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/motion";
import { PipelineGuide } from "@/components/flow/pipeline-guide";
import { EnvPreflight } from "@/components/env/env-preflight";
import { syncToServer, pullFromServer } from "@/lib/store-sync";
import { toast } from "sonner";

type DemoStep = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  status: "pending" | "active" | "completed" | "error";
};

const DEMO_STEPS: Omit<DemoStep, "status">[] = [
  {
    id: "register",
    title: "Register Agent",
    description: "Sync client state → server store, verify ERC-7715 permission exists",
    icon: UserPlus,
    href: "/register-agent",
  },
  {
    id: "run",
    title: "Run Agent",
    description: "PATCH /api/agent/loop — observe → Venice think → audit → autonomy",
    icon: Activity,
    href: "/agent-dashboard",
  },
  {
    id: "audit",
    title: "Venice AI Audit",
    description: "Fail-closed compliance gate with reasoning and flags",
    icon: Brain,
    href: "/audit-log",
  },
  {
    id: "execute",
    title: "On-chain Execute",
    description: "Approved spend via ERC-7710 delegation on Sepolia",
    icon: Zap,
    href: "/agent-dashboard",
  },
  {
    id: "deliver",
    title: "Results to CFO",
    description: "Pull server store → activity feed, audit log, trust scores",
    icon: Bot,
    href: "/dashboard",
  },
  {
    id: "venice",
    title: "Venice Observability",
    description: "Token usage, latency, x402 billing",
    icon: ScrollText,
    href: "/billing",
  },
];

const stepDetails: Record<string, string> = {
  register: "Live: syncToServer() + verify permission in server store",
  run: "Live: PATCH /api/agent/loop { systemId } → server-cycle",
  audit: "Live: VeniceService.audit fail-closed gate",
  execute: "Live: executeDelegatedTransfer if audit + autonomy pass",
  deliver: "Live: pullFromServer() → dashboard activity",
  venice: "Live: /api/billing + /api/venice/health",
};

export default function DemoPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiveRunning, setIsLiveRunning] = useState(false);
  const [liveLog, setLiveLog] = useState<string[]>([]);
  const [steps, setSteps] = useState<DemoStep[]>(
    DEMO_STEPS.map((s, i) => ({ ...s, status: i === 0 ? "active" : "pending" })),
  );
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  const setStepStatus = useCallback((index: number, status: DemoStep["status"]) => {
    setSteps((s) => s.map((step, i) => (i === index ? { ...step, status } : step)));
    setCurrentStep(index);
  }, []);

  const appendLog = useCallback((msg: string) => {
    setLiveLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  function handleStart() {
    setCurrentStep(0);
    setSteps(DEMO_STEPS.map((s, i) => ({ ...s, status: i === 0 ? "active" : "pending" })));
    setIsPlaying(true);
    setLiveLog([]);
  }

  function handleReset() {
    setIsPlaying(false);
    setIsLiveRunning(false);
    setCurrentStep(0);
    setLiveLog([]);
    setSteps(DEMO_STEPS.map((s) => ({ ...s, status: "pending" })));
  }

  async function runLiveDemo() {
    setIsLiveRunning(true);
    setLiveLog([]);
    setSteps(DEMO_STEPS.map((s, i) => ({ ...s, status: i === 0 ? "active" : "pending" })));
    setCurrentStep(0);

    try {
      // Step 0: Preflight + sync
      appendLog("Checking environment preflight...");
      const preflight = await fetch("/api/env/preflight").then((r) => r.json());
      if (!preflight.ready) {
        throw new Error("Environment not ready — check Venice, session account, and RPC");
      }
      appendLog("Preflight OK");

      appendLog("Syncing client → server...");
      const sync = await syncToServer();
      if (!sync.ok) throw new Error(sync.error ?? "syncToServer failed");
      appendLog("Store synced");

      const store = await fetch("/api/store").then((r) => r.json());
      const permission = store.permissions?.[0];
      if (!permission) {
        toast.error("No agent registered", {
          description: "Register an agent first at /register-agent",
        });
        setStepStatus(0, "error");
        appendLog("ERROR: No permission found — register agent first");
        return;
      }
      setStepStatus(0, "completed");
      appendLog(`Permission found: ${permission.systemName} (${permission.systemId})`);

      // Step 1: Run cycle
      setStepStatus(1, "active");
      appendLog(`Running agent cycle for ${permission.systemId}...`);
      const cycleRes = await fetch("/api/agent/loop", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemId: permission.systemId }),
      });
      const cycleData = await cycleRes.json();
      if (!cycleRes.ok) throw new Error(cycleData.error ?? "Cycle failed");
      setStepStatus(1, "completed");
      appendLog(`Cycle complete: ${cycleData.decision?.actions?.length ?? 0} action(s)`);

      // Step 2: Audit
      setStepStatus(2, "active");
      const auditCount = store.auditLog?.length ?? 0;
      const freshStore = await fetch("/api/store").then((r) => r.json());
      const newAudits = (freshStore.auditLog?.length ?? 0) - auditCount;
      setStepStatus(2, "completed");
      appendLog(`Audit log: ${newAudits > 0 ? `${newAudits} new record(s)` : "checked"}`);

      // Step 3: Execute
      setStepStatus(3, "active");
      const executed = cycleData.outcomes?.some((o: { executed?: boolean }) => o.executed);
      setStepStatus(3, executed ? "completed" : "active");
      appendLog(executed ? "On-chain execution succeeded" : "No execution this cycle (audit/autonomy block)");

      // Step 4: Deliver
      setStepStatus(4, "active");
      await pullFromServer();
      setStepStatus(4, "completed");
      appendLog("Results pulled to client — check /dashboard");

      // Step 5: Venice
      setStepStatus(5, "active");
      const billing = await fetch("/api/billing").then((r) => r.json());
      setStepStatus(5, "completed");
      appendLog(`Venice billing: $${billing.totalSpent?.toFixed(4) ?? 0} spent, ${billing.inferences?.length ?? 0} inferences`);

      toast.success("Live demo complete!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Live demo failed";
      appendLog(`ERROR: ${msg}`);
      toast.error(msg);
      setStepStatus(currentStep, "error");
    } finally {
      setIsLiveRunning(false);
    }
  }

  useEffect(() => {
    const el = stepRefs.current[currentStep];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentStep]);

  useEffect(() => {
    if (!isPlaying || isLiveRunning) return;
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= DEMO_STEPS.length - 1) {
          setIsPlaying(false);
          clearInterval(timer);
          return prev;
        }
        const next = prev + 1;
        setSteps((s) =>
          s.map((step, i) => ({
            ...step,
            status: i < next ? "completed" : i === next ? "active" : "pending",
          })),
        );
        return next;
      });
    }, 3500);
    return () => clearInterval(timer);
  }, [isPlaying, isLiveRunning]);

  return (
    <AppShell
      title="Live Demo"
      description="Orchestrated pipeline: Register → Run → Deliver with Venice AI."
    >
      <FadeIn>
        <div className="mb-6">
          <EnvPreflight />
        </div>

        <div className="mb-8">
          <PipelineGuide />
        </div>

        <div className="mb-8 flex flex-wrap items-center gap-4">
          <Button onClick={runLiveDemo} disabled={isLiveRunning} variant="emerald">
            {isLiveRunning ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            {isLiveRunning ? "Running Live..." : "Run Live Pipeline"}
          </Button>
          <Button onClick={handleStart} disabled={isPlaying || isLiveRunning} variant="outline">
            <Play className="h-4 w-4 mr-2" />
            {isPlaying ? "Playing..." : "Play Walkthrough"}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <div className="flex-1" />
          <Badge variant="outline">
            Step {currentStep + 1} / {steps.length}
          </Badge>
        </div>

        {liveLog.length > 0 && (
          <Card className="mb-6 border-zinc-800 bg-[#0a0a0f]">
            <CardContent className="p-4">
              <pre className="text-xs text-zinc-400 font-mono max-h-40 overflow-y-auto">
                {liveLog.join("\n")}
              </pre>
            </CardContent>
          </Card>
        )}

        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-zinc-800" />
          <Stagger className="space-y-6" stagger={0.08}>
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = step.status === "completed";
              const isError = step.status === "error";

              return (
                <StaggerItem key={step.id}>
                  <motion.div
                    ref={(el) => { stepRefs.current[index] = el; }}
                    animate={{ opacity: isActive ? 1 : isCompleted ? 0.85 : 0.5, x: isActive ? 8 : 0 }}
                    className="relative flex gap-6"
                  >
                    <div
                      className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-2 ${
                        isError
                          ? "border-red-500 bg-red-500/15"
                          : isActive
                            ? "border-emerald-500 bg-emerald-500/15"
                            : isCompleted
                              ? "border-emerald-500 bg-emerald-500/20"
                              : "border-zinc-700 bg-zinc-900"
                      }`}
                    >
                      {isError ? (
                        <AlertTriangle className="h-6 w-6 text-red-400" />
                      ) : isCompleted ? (
                        <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                      ) : (
                        <Icon className={`h-6 w-6 ${isActive ? "text-emerald-400" : "text-zinc-500"}`} />
                      )}
                    </div>

                    <div className="flex-1 pt-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className={`font-semibold ${isActive ? "text-emerald-400" : isCompleted ? "text-zinc-100" : "text-zinc-500"}`}>
                            {step.title}
                          </h3>
                          <p className="text-sm text-zinc-400 mt-1">{step.description}</p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={step.href}>
                            Buka
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      </div>

                      <AnimatePresence>
                        {isActive && stepDetails[step.id] && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3"
                          >
                            <div className="rounded-lg border border-zinc-800 bg-[#0a0a0f] p-4">
                              <pre className="text-[13px] leading-relaxed text-zinc-300 whitespace-pre-wrap font-mono">
                                {stepDetails[step.id]}
                              </pre>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>

        {currentStep === steps.length - 1 && !isPlaying && !isLiveRunning && steps.every((s) => s.status === "completed") && (
          <Card className="mt-8 border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                <h3 className="text-lg font-semibold text-emerald-400">Pipeline complete!</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="emerald" size="sm" asChild>
                  <Link href="/register-agent">Register Agent</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/agent-dashboard">Run Agent</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard">Monitor Results</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </FadeIn>
    </AppShell>
  );
}

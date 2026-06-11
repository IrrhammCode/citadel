"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Shield,
  Wallet,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  RotateCcw,
  Zap,
  Brain,
  Lock,
  Unlock,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/motion";

type DemoStep = {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  status: "pending" | "active" | "completed" | "failed";
  detail?: string;
};

export default function DemoPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [steps, setSteps] = useState<DemoStep[]>([
    {
      id: "connect",
      title: "Connect MetaMask",
      description: "CFO connects wallet to Citadel dashboard",
      icon: Wallet,
      status: "pending",
    },
    {
      id: "permission",
      title: "Grant Permission",
      description: "CFO grants ERC-7715 permission to Marketing Agent",
      icon: Lock,
      status: "pending",
    },
    {
      id: "request",
      title: "Agent Request",
      description: "Marketing Agent requests to pay vendor 8 USDC",
      icon: Bot,
      status: "pending",
    },
    {
      id: "audit",
      title: "Venice AI Audit",
      description: "AI compliance firewall reviews the request",
      icon: Brain,
      status: "pending",
    },
    {
      id: "decision",
      title: "Audit Decision",
      description: "Venice AI approves or blocks the request",
      icon: Shield,
      status: "pending",
    },
    {
      id: "execute",
      title: "On-chain Execute",
      description: "Approved transaction executes via ERC-7710 delegation",
      icon: Zap,
      status: "pending",
    },
    {
      id: "result",
      title: "Result",
      description: "Transaction complete, trust score updated",
      icon: CheckCircle2,
      status: "pending",
    },
  ]);

  // Auto-play demo
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setTimeout(() => {
      if (currentStep < steps.length - 1) {
        setCurrentStep((prev) => prev + 1);
        setSteps((prev) =>
          prev.map((step, i) => ({
            ...step,
            status:
              i < currentStep + 1
                ? "completed"
                : i === currentStep + 1
                ? "active"
                : "pending",
          }))
        );
      } else {
        setIsPlaying(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, steps.length]);

  // Start demo
  function handleStart() {
    setCurrentStep(0);
    setSteps((prev) =>
      prev.map((step, i) => ({
        ...step,
        status: i === 0 ? "active" : "pending",
      }))
    );
    setIsPlaying(true);
  }

  // Reset demo
  function handleReset() {
    setIsPlaying(false);
    setCurrentStep(0);
    setSteps((prev) =>
      prev.map((step) => ({
        ...step,
        status: "pending",
      }))
    );
  }

  // Step details
  const stepDetails: Record<string, string> = {
    connect: "MetaMask popup appears. User approves connection. Wallet address: 0x1234...CFO",
    permission: "ERC-7715 Advanced Permission granted:\n• Target: Marketing Agent\n• Limit: 10 USDC/day\n• Duration: 30 days\n• Scope: Vendor payments only",
    request: "Marketing Agent submits spend request:\n• Amount: 8 USDC\n• Recipient: 0x7099...Vendor\n• Memo: Q2 marketing invoice #1042",
    audit: "Venice AI analyzes:\n✓ Permission valid\n✓ Amount within daily limit\n✓ Recipient verified\n✓ Memo legitimate\n✓ Budget available\n✓ No anomalies detected",
    decision: "Venice AI Verdict:\n• Decision: APPROVED\n• Confidence: 92%\n• Reasoning: Valid vendor payment within limits",
    execute: "ERC-7710 delegation redeemed:\n• Session account executes transfer\n• 8 USDC transferred to vendor\n• Gasless via MetaMask Smart Accounts Kit\n• Transaction hash: 0xabcd...ef01",
    result: "Final state:\n• Vendor received 8 USDC ✅\n• Marketing Agent budget: 500 → 492 USDC\n• Trust score: 82 → 85 (+3)\n• Audit log updated\n• KPI progress: ROI 1.8x → 1.9x",
  };

  return (
    <AppShell
      title="Live Demo"
      description="Watch Citadel in action — from permission grant to on-chain execution."
    >
      <FadeIn>
        {/* ── Controls ────────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-8">
          <Button onClick={handleStart} disabled={isPlaying}>
            <Play className="h-4 w-4 mr-2" />
            {isPlaying ? "Playing..." : "Start Demo"}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <div className="flex-1" />
          <Badge variant="outline">
            Step {currentStep + 1} of {steps.length}
          </Badge>
        </div>

        {/* ── Timeline ────────────────────────────────────── */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-zinc-800" />

          <Stagger className="space-y-6" stagger={0.1}>
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = step.status === "completed";
              const isFailed = step.status === "failed";

              return (
                <StaggerItem key={step.id}>
                  <motion.div
                    animate={{
                      opacity: isActive ? 1 : isCompleted ? 0.8 : 0.5,
                      x: isActive ? 8 : 0,
                    }}
                    className="relative flex gap-6"
                  >
                    {/* Icon */}
                    <div
                      className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-2 ${
                        isActive
                          ? "border-emerald-500 bg-emerald-500/10"
                          : isCompleted
                          ? "border-emerald-500 bg-emerald-500/20"
                          : isFailed
                          ? "border-red-500 bg-red-500/10"
                          : "border-zinc-700 bg-zinc-900"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                      ) : isFailed ? (
                        <XCircle className="h-6 w-6 text-red-400" />
                      ) : (
                        <Icon
                          className={`h-6 w-6 ${
                            isActive ? "text-emerald-400" : "text-zinc-500"
                          }`}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pt-2">
                      <h3
                        className={`font-semibold ${
                          isActive
                            ? "text-emerald-400"
                            : isCompleted
                            ? "text-zinc-100"
                            : "text-zinc-500"
                        }`}
                      >
                        {step.title}
                      </h3>
                      <p className="text-sm text-zinc-400 mt-1">
                        {step.description}
                      </p>

                      {/* Detail */}
                      <AnimatePresence>
                        {isActive && stepDetails[step.id] && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3"
                          >
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                              <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono">
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

        {/* ── Summary Card ────────────────────────────────── */}
        <AnimatePresence>
          {currentStep === steps.length - 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-8"
            >
              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                    <h3 className="text-lg font-semibold text-emerald-400">
                      Demo Complete!
                    </h3>
                  </div>
                  <p className="text-sm text-zinc-300 mb-4">
                    Citadel successfully demonstrated the zero-trust treasury flow:
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      MetaMask wallet connected
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ERC-7715 permission granted
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      Venice AI audit completed
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      On-chain execution successful
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </FadeIn>
    </AppShell>
  );
}

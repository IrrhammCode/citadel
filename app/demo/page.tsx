"use client";

import { useState, useEffect, useRef } from "react";
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
  Database,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/motion";
import { seedDemoData } from "@/lib/demo/seed-data";
import { toast } from "sonner";

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
  const [isSeeding, setIsSeeding] = useState(false);
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
      id: "blocked",
      title: "Block Suspicious",
      description: "Agent tries suspicious address, Venice blocks it",
      icon: XCircle,
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

  // Seed demo data
  async function handleSeedData() {
    setIsSeeding(true);
    try {
      seedDemoData();
      toast.success("Demo data seeded successfully!");
    } catch (error) {
      toast.error("Failed to seed demo data");
    } finally {
      setIsSeeding(false);
    }
  }

  // Auto-play demo
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
    connect: "MetaMask popup appears. User approves connection.\nWallet address: 0x1234...CFO\nNetwork: Sepolia Testnet",
    permission: "ERC-7715 Advanced Permission granted:\n• Target: Marketing Agent\n• Limit: 100 USDC/day\n• Duration: 30 days\n• Scope: Vendor payments only",
    request: "Marketing Agent submits spend request:\n• Amount: 8 USDC\n• Recipient: 0x7099...Vendor\n• Memo: Q2 marketing invoice #1042\n• Agent trust score: 85/100",
    audit: "Venice AI analyzes:\n✓ Permission valid\n✓ Amount within daily limit\n✓ Recipient verified\n✓ Memo legitimate\n✓ Budget available\n✓ No anomalies detected\n✓ Vendor history: 5 previous payments",
    decision: "Venice AI Verdict:\n• Decision: APPROVED\n• Confidence: 94%\n• Reasoning: Valid vendor payment within limits\n• Pattern: Normal spending behavior",
    execute: "ERC-7710 delegation redeemed:\n• Session account executes transfer\n• 8 USDC transferred to vendor\n• Gasless via MetaMask Smart Accounts Kit\n• Transaction hash: 0xabcd...ef01\n• Block: #12345678",
    blocked: "Suspicious Request:\n• Amount: 50 USDC\n• Recipient: 0x3C44...suspicious\n• Venice AI: BLOCKED\n• Reason: Address flagged as malicious\n• Trust score: -5 points",
    result: "Final state:\n• Vendor received 8 USDC ✅\n• Marketing Agent budget: 500 → 492 USDC\n• Trust score: 82 → 85 (+3)\n• Audit log updated\n• KPI progress: ROI 1.8x → 1.9x\n• Anomaly logged for blocked request",
  };

  // Smooth scroll to active step
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const el = stepRefs.current[currentStep];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentStep]);

  // Auto-advance steps
  useState(() => {
    if (isPlaying) {
      const timer = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            clearInterval(timer);
            return prev;
          }
          setSteps((s) =>
            s.map((step, i) => ({
              ...step,
              status: i < prev + 1 ? "completed" : i === prev + 1 ? "active" : "pending",
            }))
          );
          return prev + 1;
        });
      }, 3000);
      return () => clearInterval(timer);
    }
  });

  return (
    <AppShell
      title="Live Demo"
      description="Watch Citadel in action — from permission grant to on-chain execution."
    >
      <FadeIn>
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <Button onClick={handleStart} disabled={isPlaying}>
            <Play className="h-4 w-4 mr-2" />
            {isPlaying ? "Playing..." : "Start Demo"}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button variant="secondary" onClick={handleSeedData} disabled={isSeeding}>
            {isSeeding ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Database className="h-4 w-4 mr-2" />
            )}
            {isSeeding ? "Seeding..." : "Seed Demo Data"}
          </Button>
          <div className="flex-1" />
          <Badge variant="outline">
            Step {currentStep + 1} of {steps.length}
          </Badge>
        </div>

        {/* Timeline */}
        <div className="relative">
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
                    ref={(el) => { stepRefs.current[index] = el; }}
                    animate={{
                      opacity: isActive ? 1 : isCompleted ? 0.85 : 0.5,
                      x: isActive ? 8 : 0,
                      scale: isActive ? 1.02 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="relative flex gap-6"
                  >
                    {/* Icon */}
                    <div
                      className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                        isActive
                          ? "border-emerald-500 bg-emerald-500/15 shadow-[0_0_16px_rgba(16,185,129,0.25)]"
                          : isCompleted
                          ? "border-emerald-500 bg-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                          : isFailed
                          ? "border-red-500 bg-red-500/15 shadow-[0_0_12px_rgba(239,68,68,0.2)]"
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
                        className={`font-semibold transition-colors duration-200 ${
                          isActive
                            ? "text-emerald-400"
                            : isCompleted
                            ? "text-zinc-100"
                            : isFailed
                            ? "text-red-400"
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
                            <div className="rounded-lg border border-zinc-800 bg-[#0a0a0f] p-4">
                              <pre className="text-[13px] leading-relaxed text-zinc-300 whitespace-pre-wrap font-mono" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
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

        {/* Summary Card */}
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
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      Suspicious request blocked
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      Trust score updated
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

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFlowProgress } from "@/hooks/useFlowProgress";
import { cn } from "@/lib/utils";

type Props = {
  compact?: boolean;
  showCta?: boolean;
};

export function PipelineGuide({ compact, showCta = true }: Props) {
  const { steps, progress, currentStep } = useFlowProgress();

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center gap-2">
            <Link
              href={step.href}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
                step.done
                  ? "border-[--border-emerald] bg-[--brand-glow] text-[--brand-primary]"
                  : step.active
                    ? "border-[--border-emerald] bg-[--brand-glow] text-[--brand-primary]"
                    : "border-[--border-default] text-[--text-secondary] hover:border-[--border-emerald]",
              )}
            >
              {step.done ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
              {step.label}
            </Link>
            {i < steps.length - 1 && (
              <ArrowRight className="h-3 w-3 text-zinc-700" />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="vault-card p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.15em] text-[--text-tertiary] uppercase">Secure Flow</p>
          <h2 className="mt-1 font-display text-xl font-medium text-[--text-primary]">
            Register → Run → Deliver
          </h2>
          <p className="mt-1 text-sm text-[--text-secondary]">
            Follow the audited pipeline. Every transition gated.
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-medium text-[--brand-primary]">{progress}%</p>
          <p className="text-[10px] text-[--text-muted] uppercase tracking-wider">complete</p>
        </div>
      </div>

      {/* Progress bar — emerald focused */}
      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-[--border-subtle]">
        <motion.div
          className="h-full rounded-full bg-[--brand-primary]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <Link
            key={step.id}
            href={step.href}
            className={cn(
              "group relative rounded-lg border p-4 transition-all",
              step.active
                ? "border-[--border-emerald] bg-[--brand-glow] shadow-[--shadow-glow]"
                : step.done
                  ? "border-[--border-emerald] bg-[--brand-glow]/60"
                  : "border-[--border-default] bg-[--canvas-elevated] hover:border-[--border-emerald]",
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                  step.done
                    ? "bg-[--brand-glow] text-[--brand-primary]"
                    : step.active
                      ? "bg-[--brand-glow] text-[--brand-primary]"
                      : "bg-[--border-subtle] text-[--text-tertiary]",
                )}
              >
                {step.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </span>
              {step.active && (
                <span className="rounded-full bg-[--brand-glow] px-2 py-0.5 text-[10px] text-[--brand-primary]">
                  next
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-[--text-primary] group-hover:text-[--text-primary]">
              {step.label}
            </p>
            <p className="mt-1 text-xs text-[--text-secondary]">{step.description}</p>
          </Link>
        ))}
      </div>

      {showCta && currentStep && !currentStep.done && (
        <div className="mt-5 flex justify-end">
          <Button variant="emerald" size="sm" asChild>
            <Link href={currentStep.href}>
              Continue: {currentStep.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

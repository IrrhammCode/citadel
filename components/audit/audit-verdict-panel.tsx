"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AuditVerdict } from "@/types/audit";
import { staggerContainer, staggerItem } from "@/lib/motion";

const verdictVariants = {
  initial: { opacity: 0, y: 24, scale: 0.95, filter: "blur(6px)" },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { type: "spring" as const, stiffness: 350, damping: 30, mass: 0.8 },
  },
  exit: {
    opacity: 0,
    y: -16,
    scale: 0.97,
    filter: "blur(4px)",
    transition: { duration: 0.2, ease: "easeIn" as const },
  },
};

const confidenceBarVariants = {
  initial: { scaleX: 0 },
  animate: (confidence: number) => ({
    scaleX: confidence,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: 0.3 },
  }),
};

export function AuditVerdictPanel({ verdict }: { verdict: AuditVerdict }) {
  const approved = verdict.decision === "approved";
  const confidencePercent = Math.round(verdict.confidence * 100);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={verdict.decision + verdict.confidence.toFixed(2)}
        variants={verdictVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        layout
      >
        <Card
          className={
            approved
              ? "border-emerald-500/30 bg-emerald-500/[0.08] shadow-[0_0_30px_rgba(16,185,129,0.08)]"
              : "border-red-500/30 bg-red-500/[0.08] shadow-[0_0_30px_rgba(239,68,68,0.08)]"
          }
        >
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 20, delay: 0.1 }}
              >
                {approved ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-400" />
                )}
              </motion.div>
              <CardTitle className="text-base font-semibold tracking-tight text-[#f2f2f2]">
                Venice AI:{" "}
                <span className={approved ? "text-emerald-400" : "text-red-400"}>
                  {approved ? "Approved" : "Blocked"}
                </span>
              </CardTitle>
            </div>
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, ease: "easeOut" }}
            >
              <Badge
                variant={approved ? "default" : "destructive"}
                className="font-mono text-xs"
              >
                {confidencePercent}% confidence
              </Badge>
            </motion.div>
          </CardHeader>

          <CardContent className="space-y-5 pt-0">
            {/* Confidence bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#a1a1aa] font-mono">
                <span>Confidence</span>
                <span>{confidencePercent}%</span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/[0.05]">
                <motion.div
                  className={`absolute inset-y-0 left-0 origin-left rounded-full ${
                    approved
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                      : "bg-gradient-to-r from-red-500 to-red-400"
                  }`}
                  variants={confidenceBarVariants}
                  initial="initial"
                  animate="animate"
                  custom={verdict.confidence}
                  style={{ width: "100%" }}
                />
                {/* Glow overlay */}
                <motion.div
                  className={`absolute inset-y-0 left-0 origin-left rounded-full opacity-40 blur-sm ${
                    approved ? "bg-emerald-400" : "bg-red-400"
                  }`}
                  initial={{ scaleX: 0 }}
                  animate={{
                    scaleX: verdict.confidence,
                    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.3 },
                  }}
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            {/* Reasoning text */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.3, ease: "easeOut" }}
              className="rounded-lg bg-white/[0.03] p-4"
            >
              <p className="text-sm leading-[1.75] tracking-normal text-[#d4d4d8] font-[400] font-['Inter',system-ui,-apple-system,sans-serif] whitespace-pre-line">
                {verdict.reasoning}
              </p>
            </motion.div>

            {/* Flags */}
            {verdict.flags.length > 0 && (
              <motion.div
                variants={staggerContainer(0.06)}
                initial="hidden"
                animate="visible"
                className="flex flex-wrap gap-2 pt-1"
              >
                {verdict.flags.map((flag) => (
                  <motion.div key={flag} variants={staggerItem}>
                    <Badge variant="warning" className="gap-1.5 text-xs font-medium">
                      <AlertTriangle className="h-3 w-3" />
                      {flag}
                    </Badge>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

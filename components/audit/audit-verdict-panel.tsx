"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AuditVerdict } from "@/types/audit";
import { staggerContainer, staggerItem } from "@/lib/motion";

export function AuditVerdictPanel({ verdict }: { verdict: AuditVerdict }) {
  const approved = verdict.decision === "approved";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
    >
      <Card
        className={
          approved
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-red-500/30 bg-red-500/5"
        }
      >
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
            >
              {approved ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
            </motion.div>
            <CardTitle className="text-base">
              Venice AI: {approved ? "Approved" : "Blocked"}
            </CardTitle>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Badge variant={approved ? "default" : "destructive"}>
              {Math.round(verdict.confidence * 100)}% confidence
            </Badge>
          </motion.div>
        </CardHeader>
        <CardContent className="space-y-3">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-sm leading-relaxed text-zinc-300"
          >
            {verdict.reasoning}
          </motion.p>
          {verdict.flags.length > 0 && (
            <motion.div
              variants={staggerContainer(0.06)}
              initial="hidden"
              animate="visible"
              className="flex flex-wrap gap-2"
            >
              {verdict.flags.map((flag) => (
                <motion.div key={flag} variants={staggerItem}>
                  <Badge variant="warning" className="gap-1">
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
  );
}

"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Shield, Clock, Zap, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StoredPermission } from "@/types/permission";

function useCountdown(expiry: number) {
  return useMemo(() => {
    const now = Date.now();
    const expiryMs = expiry * 1000;
    const diff = expiryMs - now;

    if (diff <= 0) return { expired: true, text: "Expired" };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return { expired: false, text: `${days}d ${hours}h remaining` };
    if (hours > 0) return { expired: false, text: `${hours}h ${minutes}m remaining` };
    return { expired: false, text: `${minutes}m remaining` };
  }, [expiry]);
}

export function PermissionCard({ permission }: { permission: StoredPermission }) {
  const { expired, text: countdownText } = useCountdown(permission.expiry);

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={
          expired
            ? "border-border-default"
            : "border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
        }
      >
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 5, repeat: Infinity }}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15"
            >
              <Shield className="h-4 w-4 text-emerald-400" />
            </motion.div>
            <div>
              <CardTitle className="text-sm font-semibold text-zinc-100">
                {permission.systemName}
              </CardTitle>
              <p className="text-xs text-zinc-500">Smart Account Permission</p>
            </div>
          </div>
          <Badge
            variant={expired ? "destructive" : "default"}
            className={
              expired
                ? ""
                : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
            }
          >
            {expired ? "Expired" : "Active"}
          </Badge>
        </CardHeader>

        <CardContent className="space-y-4 text-sm">
          {/* Scope indicator */}
          <div className="flex items-center gap-2 rounded-lg bg-zinc-800/50 px-3 py-2">
            <Zap className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-zinc-300">
              Spend Limit: {permission.maxDailySpend} USDC/day
            </span>
          </div>

          {/* Expiry with countdown */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-zinc-500">Expiry</span>
            </div>
            <div className="flex items-center gap-2">
              {!expired && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
              )}
              <span
                className={
                  expired
                    ? "font-mono text-xs text-red-400"
                    : "font-mono text-xs text-emerald-400"
                }
              >
                {countdownText}
              </span>
            </div>
          </div>

          {/* Session address */}
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Session</span>
            <span className="font-mono text-xs text-zinc-300">
              {permission.sessionAddress.slice(0, 6)}...{permission.sessionAddress.slice(-4)}
            </span>
          </div>

          {/* Justification */}
          {permission.justification && (
            <p className="rounded-md bg-zinc-800/30 px-3 py-2 text-xs italic text-zinc-500">
              {permission.justification}
            </p>
          )}

          {/* Grant button (shown for review/confirmation) */}
          {!expired && (
            <Button
              variant="ghost"
              className="w-full justify-between border border-zinc-700/50 bg-zinc-800/30 text-zinc-300 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400"
            >
              <span className="text-xs font-medium">View Details</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

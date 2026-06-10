"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRightLeft,
  FileText,
  TrendingUp,
  Shield,
  Zap,
} from "lucide-react";
import type { ActivityEvent } from "@/types/activity";
import { getActivity } from "@/lib/storage";

const typeConfig = {
  audit: { icon: Shield, color: "text-cyan-400" },
  trust_change: { icon: TrendingUp, color: "text-purple-400" },
  anomaly: { icon: AlertTriangle, color: "text-amber-400" },
  negotiation: { icon: ArrowRightLeft, color: "text-blue-400" },
  report: { icon: FileText, color: "text-emerald-400" },
  execution: { icon: Zap, color: "text-yellow-400" },
  goal_progress: { icon: CheckCircle2, color: "text-green-400" },
  vendor_update: { icon: Activity, color: "text-orange-400" },
};

const severityConfig = {
  info: "text-zinc-400",
  success: "text-emerald-400",
  warning: "text-amber-400",
  error: "text-red-400",
};

type Props = {
  systemId?: string;
  limit?: number;
  compact?: boolean;
};

export function ActivityFeed({ systemId, limit = 20, compact }: Props) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    const data = getActivity(limit);
    const filtered = systemId ? data.filter((e) => e.systemId === systemId) : data;
    setEvents(filtered);
  }, [systemId, limit]);

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 text-center">
        <Activity className="mx-auto h-8 w-8 text-zinc-600" />
        <p className="mt-2 text-sm text-zinc-500">No agent activity yet</p>
        <p className="text-xs text-zinc-600">Actions will appear here as agents operate</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!compact && (
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-medium text-zinc-300">Agent Activity</h3>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
            {events.length}
          </span>
        </div>
      )}

      <AnimatePresence initial={false}>
        {events.map((event, i) => {
          const config = typeConfig[event.type];
          const Icon = config.icon;

          return (
            <motion.div
              key={event.id}
              initial={i === 0 ? { opacity: 0, x: -20 } : false}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-start gap-3 rounded-lg border border-zinc-800/50 bg-zinc-900/20 p-3 ${
                i === 0 ? "border-cyan-500/20 bg-cyan-500/5" : ""
              }`}
            >
              <div className={`mt-0.5 rounded-md bg-zinc-800 p-1.5`}>
                <Icon className={`h-3.5 w-3.5 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-200 truncate">
                    {event.systemName}
                  </span>
                  <span className={`text-xs ${severityConfig[event.severity]}`}>
                    {event.type}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-zinc-400 truncate">{event.message}</p>
                {event.details && (
                  <p className="mt-1 text-xs text-zinc-500 truncate">{event.details}</p>
                )}
              </div>
              <span className="text-xs text-zinc-600 whitespace-nowrap">
                {formatTime(event.timestamp)}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function formatTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString();
}
